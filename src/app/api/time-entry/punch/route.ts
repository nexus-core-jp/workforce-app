import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isMonthClosed } from "@/lib/close";
import { prisma } from "@/lib/db";
import { diffMinutes, startOfJstDay } from "@/lib/time";

type PunchAction = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

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

  const { id: userId, tenantId } = session.user;
  if (!tenantId || !userId) return jsonError("Invalid session", 401);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body
  }

  const action = body?.action as PunchAction | undefined;
  if (!action) return jsonError("Missing action");

  const today = startOfJstDay(new Date());
  const now = new Date();

  if (await isMonthClosed(tenantId, today)) {
    return jsonError("This month is closed", 409);
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
}
