import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isMonthClosed } from "@/lib/close";
import { prisma } from "@/lib/db";
import { startOfJstDay } from "@/lib/time";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

const schema = z.object({
  // YYYY-MM-DD (JST)
  date: z.string().min(10),
  requestedClockInAt: z.string().datetime().optional().nullable(),
  requestedBreakStartAt: z.string().datetime().optional().nullable(),
  requestedBreakEndAt: z.string().datetime().optional().nullable(),
  requestedClockOutAt: z.string().datetime().optional().nullable(),
  reason: z.string().min(1).max(500),
});

function parseJstDateOnly(dateStr: string): Date {
  // Interpret YYYY-MM-DD as JST date-only.
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const approx = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  return startOfJstDay(approx);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = session.user as any;
  const tenantId: string | undefined = user.tenantId;
  const userId: string | undefined = user.id;
  if (!tenantId || !userId) return jsonError("Invalid session", 401);

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const date = parseJstDateOnly(input.data.date);

  if (await isMonthClosed(tenantId, date)) {
    return jsonError("This month is closed", 409);
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

  return NextResponse.json({ ok: true, correction: created });
}
