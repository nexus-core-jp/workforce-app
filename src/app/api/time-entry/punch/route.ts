import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { isMonthClosed } from "@/lib/close";
import { prisma } from "@/lib/db";
import { findBestMatch, isValidDescriptor } from "@/lib/face-match";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";
import { diffMinutes, startOfJstDay } from "@/lib/time";

type PunchAction = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";

function computeWorkMinutes(entry: {
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
}): number {
  if (!entry.clockInAt || !entry.clockOutAt) return 0;
  const total = diffMinutes(entry.clockInAt, entry.clockOutAt);
  let breakMin = 0;
  if (entry.breakStartAt && entry.breakEndAt) {
    breakMin = Math.max(0, diffMinutes(entry.breakStartAt, entry.breakEndAt));
  }
  return Math.max(0, total - breakMin);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = body?.action as PunchAction | undefined;
  if (!action) return jsonError("Missing action");

  const today = startOfJstDay(new Date());
  const now = new Date();

  if (await isMonthClosed(tenantId, today)) {
    return jsonError("This month is closed", 409);
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

      const result = findBestMatch(
        faceDescriptor,
        stored.map((s) => s.descriptor as number[]),
      );

      if (!result.matched) {
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
    workMinutes?: number;
  } = {};

  // Basic state machine
  if (action === "CLOCK_IN") {
    if (entry.clockInAt) return jsonError("Already clocked in", 409);
    next.clockInAt = now;
  }

  if (action === "BREAK_START") {
    if (!entry.clockInAt) return jsonError("Not clocked in", 409);
    if (entry.clockOutAt) return jsonError("Already clocked out", 409);
    if (entry.breakStartAt && !entry.breakEndAt) return jsonError("Break already started", 409);
    // allow multiple breaks later; for MVP we only support one.
    if (entry.breakStartAt && entry.breakEndAt) return jsonError("Break already finished (MVP supports one break)", 409);
    next.breakStartAt = now;
  }

  if (action === "BREAK_END") {
    if (!entry.breakStartAt) return jsonError("Break not started", 409);
    if (entry.breakEndAt) return jsonError("Break already ended", 409);
    next.breakEndAt = now;
  }

  if (action === "CLOCK_OUT") {
    if (!entry.clockInAt) return jsonError("Not clocked in", 409);
    if (entry.clockOutAt) return jsonError("Already clocked out", 409);
    if (entry.breakStartAt && !entry.breakEndAt) return jsonError("Break in progress", 409);
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
