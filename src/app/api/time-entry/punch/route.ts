import { NextResponse } from "next/server";

import { ERROR_MESSAGES } from "@/lib/constants";
import { jsonError, requireAuth } from "@/lib/api";
import { isMonthClosed } from "@/lib/close";
import { prisma } from "@/lib/db";
import { findBestMatch, isValidDescriptor } from "@/lib/face-match";
import { guardSuspended } from "@/lib/tenant-guard";
import { startOfJstDay } from "@/lib/time";
import { computeWorkMinutes } from "@/lib/work-time";

type PunchAction = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";

export async function POST(req: Request) {
  const result = await requireAuth();
  if (!result.ok) return result.response;
  const { id: userId, tenantId } = result.user;

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body
  }

  const action = body?.action as PunchAction | undefined;
  if (!action) return jsonError(ERROR_MESSAGES.MISSING_ACTION);

  const today = startOfJstDay(new Date());
  const now = new Date();

  if (await isMonthClosed(tenantId, today)) {
    return jsonError(ERROR_MESSAGES.MONTH_CLOSED, 409);
  }

  // Face verification when enabled (required for CLOCK_IN and CLOCK_OUT)
  if (action === "CLOCK_IN" || action === "CLOCK_OUT") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { faceAuthEnabled: true },
    });

    if (tenant?.faceAuthEnabled) {
      const faceDescriptor = body?.faceDescriptor;
      if (!isValidDescriptor(faceDescriptor)) {
        return jsonError("顔認証が必要です", 403);
      }

      const stored = await prisma.faceDescriptor.findMany({
        where: { tenantId, userId },
        select: { descriptor: true },
      });

      if (stored.length === 0) {
        return jsonError(
          "顔が未登録です。先に顔登録を行ってください。",
          403,
        );
      }

      const faceResult = findBestMatch(
        faceDescriptor,
        stored.map((s) => s.descriptor as number[]),
      );

      if (!faceResult.matched) {
        return jsonError("顔認証に失敗しました", 403);
      }
    }
  }

  // Ensure today's TimeEntry exists (for the tenant/user/date triple)
  const entry = await prisma.timeEntry.upsert({
    where: { tenantId_userId_date: { tenantId, userId, date: today } },
    create: { tenantId, userId, date: today },
    update: {},
  });

  const next: {
    clockInAt?: Date | null;
    breakStartAt?: Date | null;
    breakEndAt?: Date | null;
    clockOutAt?: Date | null;
  } = {};

  if (action === "CLOCK_IN") {
    if (entry.clockInAt) return jsonError(ERROR_MESSAGES.ALREADY_CLOCKED_IN, 409);
    next.clockInAt = now;
  }

  if (action === "BREAK_START") {
    if (!entry.clockInAt) return jsonError(ERROR_MESSAGES.NOT_CLOCKED_IN, 409);
    if (entry.clockOutAt) return jsonError(ERROR_MESSAGES.ALREADY_CLOCKED_OUT, 409);
    if (entry.breakStartAt && !entry.breakEndAt) return jsonError(ERROR_MESSAGES.BREAK_ALREADY_STARTED, 409);
    if (entry.breakStartAt && entry.breakEndAt) return jsonError(ERROR_MESSAGES.BREAK_ALREADY_FINISHED, 409);
    next.breakStartAt = now;
  }

  if (action === "BREAK_END") {
    if (!entry.breakStartAt) return jsonError(ERROR_MESSAGES.BREAK_NOT_STARTED, 409);
    if (entry.breakEndAt) return jsonError(ERROR_MESSAGES.BREAK_ALREADY_ENDED, 409);
    next.breakEndAt = now;
  }

  if (action === "CLOCK_OUT") {
    if (!entry.clockInAt) return jsonError(ERROR_MESSAGES.NOT_CLOCKED_IN, 409);
    if (entry.clockOutAt) return jsonError(ERROR_MESSAGES.ALREADY_CLOCKED_OUT, 409);
    if (entry.breakStartAt && !entry.breakEndAt) return jsonError(ERROR_MESSAGES.BREAK_IN_PROGRESS, 409);
    next.clockOutAt = now;
  }

  try {
    const updated = await prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        ...next,
        workMinutes: computeWorkMinutes({
          clockInAt: next.clockInAt ?? entry.clockInAt,
          clockOutAt: next.clockOutAt ?? entry.clockOutAt,
          breakStartAt: next.breakStartAt ?? entry.breakStartAt,
          breakEndAt: next.breakEndAt ?? entry.breakEndAt,
        }),
      },
    });

    return NextResponse.json({ ok: true, entry: updated });
  } catch (err) {
    console.error("[time-entry/punch] DB error:", err);
    return jsonError("打刻の保存に失敗しました。再度お試しください。", 500);
  }
}
