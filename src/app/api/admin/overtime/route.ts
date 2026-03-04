import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import {
  STANDARD_DAILY_MINUTES,
  MONTHLY_OVERTIME_LIMIT_MINUTES,
  calcDailyOvertime,
} from "@/lib/overtime";
import { startOfJstDay, addJstDays } from "@/lib/time";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** GET /api/admin/overtime?month=YYYY-MM */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) return jsonError("Invalid session", 401);

  const { tenantId, role } = user;
  if (role !== "ADMIN") return jsonError("Forbidden", 403);

  const monthParam = req.nextUrl.searchParams.get("month");
  const now = new Date();
  const month = monthParam ?? new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(now);

  // Parse month to date range
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monthStr, 10);
  const startDate = startOfJstDay(new Date(Date.UTC(year, mon - 1, 1)));
  const endDate = startOfJstDay(new Date(Date.UTC(year, mon, 0))); // last day of month

  // Get all users in tenant
  const users = await prisma.user.findMany({
    where: { tenantId, active: true, role: { not: "SUPER_ADMIN" } },
    select: { id: true, name: true, email: true },
  });

  // Get all time entries for the month
  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      date: { gte: startDate, lte: addJstDays(endDate, 1) },
    },
  });

  // Get shift assignments for custom standard hours
  const shiftAssignments = await prisma.shiftAssignment.findMany({
    where: {
      tenantId,
      startDate: { lte: addJstDays(endDate, 1) },
      endDate: { gte: startDate },
    },
    include: { shiftPattern: true },
  });

  // Build user shift map: userId -> standard minutes per day
  const userStandardMinutes = new Map<string, number>();
  for (const sa of shiftAssignments) {
    if (sa.shiftPattern) {
      const [startH, startM] = sa.shiftPattern.plannedStart.split(":").map(Number);
      const [endH, endM] = sa.shiftPattern.plannedEnd.split(":").map(Number);
      const planned = (endH * 60 + endM) - (startH * 60 + startM) - sa.shiftPattern.defaultBreakMinutes;
      if (planned > 0) {
        userStandardMinutes.set(sa.userId, planned);
      }
    }
  }

  // Group entries by user
  const userEntries = new Map<string, number[]>();
  for (const e of entries) {
    const arr = userEntries.get(e.userId) ?? [];
    arr.push(e.workMinutes);
    userEntries.set(e.userId, arr);
  }

  // Calculate overtime for each user
  const summaries = users.map((u) => {
    const dailyMinutes = userEntries.get(u.id) ?? [];
    const standardMin = userStandardMinutes.get(u.id) ?? STANDARD_DAILY_MINUTES;

    let totalWork = 0;
    let totalOvertime = 0;

    for (const wm of dailyMinutes) {
      totalWork += wm;
      totalOvertime += calcDailyOvertime(wm, standardMin);
    }

    return {
      userId: u.id,
      userName: u.name ?? u.email,
      totalWorkMinutes: totalWork,
      totalOvertimeMinutes: totalOvertime,
      workDays: dailyMinutes.length,
      exceeds36Agreement: totalOvertime > MONTHLY_OVERTIME_LIMIT_MINUTES,
      overtimePercentage: Math.round((totalOvertime / MONTHLY_OVERTIME_LIMIT_MINUTES) * 100),
    };
  });

  // Sort by overtime descending
  summaries.sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes);

  return NextResponse.json({
    ok: true,
    month,
    summaries,
    alerts: summaries.filter((s) => s.overtimePercentage >= 80),
  });
}
