import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ERROR_MESSAGES, REASON_MAX_LENGTH } from "@/lib/constants";
import { jsonError } from "@/lib/api";
import { isMonthClosed } from "@/lib/close";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { guardSuspended } from "@/lib/tenant-guard";
import { notifyAdmins } from "@/lib/notify";
import { startOfJstDay } from "@/lib/time";

const schema = z.object({
  date: z.string().min(10),
  requestedClockInAt: z.string().datetime().optional().nullable(),
  requestedBreakStartAt: z.string().datetime().optional().nullable(),
  requestedBreakEndAt: z.string().datetime().optional().nullable(),
  requestedClockOutAt: z.string().datetime().optional().nullable(),
  reason: z.string().min(1).max(REASON_MAX_LENGTH),
});

function parseJstDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const approx = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  return startOfJstDay(approx);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, id: userId } = user;

  const suspended = await guardSuspended(tenantId);
  if (suspended) return suspended;

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(ERROR_MESSAGES.INVALID_INPUT);

  const date = parseJstDateOnly(input.data.date);

  if (await isMonthClosed(tenantId, date)) {
    return jsonError(ERROR_MESSAGES.MONTH_CLOSED, 409);
  }

  const created = await prisma.attendanceCorrection.create({
    data: {
      tenantId,
      userId,
      date,
      requestedClockInAt: input.data.requestedClockInAt ? new Date(input.data.requestedClockInAt) : null,
      requestedBreakStartAt: input.data.requestedBreakStartAt ? new Date(input.data.requestedBreakStartAt) : null,
      requestedBreakEndAt: input.data.requestedBreakEndAt ? new Date(input.data.requestedBreakEndAt) : null,
      requestedClockOutAt: input.data.requestedClockOutAt ? new Date(input.data.requestedClockOutAt) : null,
      reason: input.data.reason,
    },
  });

  // Notify admins/approvers
  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const requesterName = requester?.name ?? requester?.email ?? "ユーザー";
  await notifyAdmins(
    tenantId,
    "CORRECTION_REQUESTED",
    `${requesterName}さんから打刻修正申請`,
    `${requesterName}さんが${input.data.date}の打刻修正を申請しました。`,
    "/admin",
  );

  return NextResponse.json({ ok: true, correction: created });
}
