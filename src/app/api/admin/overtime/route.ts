import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import {
  STANDARD_DAILY_MINUTES,
  MONTHLY_OVERTIME_LIMIT_MINUTES,
} from "@/lib/overtime";
import { startOfJstDay, addJstDays } from "@/lib/time";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface OvertimeRow {
  userId: string;
  userName: string;
  userEmail: string;
  totalWorkMinutes: bigint;
  totalOvertimeMinutes: bigint;
  workDays: bigint;
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
  const endDate = addJstDays(startOfJstDay(new Date(Date.UTC(year, mon, 0))), 1);

  // Single SQL query: aggregate work & overtime per user using DB-side computation
  // Uses LEFT JOIN on shift assignments to get custom standard minutes,
  // falling back to the default 480 (8h).
  const rows = await prisma.$queryRaw<OvertimeRow[]>`
    SELECT
      u."id"    AS "userId",
      COALESCE(u."name", u."email") AS "userName",
      u."email" AS "userEmail",
      COALESCE(SUM(te."workMinutes"), 0) AS "totalWorkMinutes",
      COALESCE(SUM(GREATEST(0, te."workMinutes" - COALESCE(sp_std.standard_minutes, ${STANDARD_DAILY_MINUTES}))), 0) AS "totalOvertimeMinutes",
      COUNT(te."id") AS "workDays"
    FROM "User" u
    LEFT JOIN "TimeEntry" te
      ON te."userId" = u."id"
      AND te."tenantId" = ${tenantId}
      AND te."date" >= ${startDate}
      AND te."date" < ${endDate}
    LEFT JOIN LATERAL (
      SELECT
        ((SPLIT_PART(sp."plannedEnd", ':', 1)::int * 60 + SPLIT_PART(sp."plannedEnd", ':', 2)::int)
        - (SPLIT_PART(sp."plannedStart", ':', 1)::int * 60 + SPLIT_PART(sp."plannedStart", ':', 2)::int)
        - sp."defaultBreakMinutes") AS standard_minutes
      FROM "ShiftAssignment" sa
      JOIN "ShiftPattern" sp ON sp."id" = sa."shiftPatternId"
      WHERE sa."userId" = u."id"
        AND sa."tenantId" = ${tenantId}
        AND sa."startDate" <= ${endDate}
        AND sa."endDate" >= ${startDate}
      ORDER BY sa."startDate" DESC
      LIMIT 1
    ) sp_std ON true
    WHERE u."tenantId" = ${tenantId}
      AND u."active" = true
      AND u."role" != 'SUPER_ADMIN'
    GROUP BY u."id", u."name", u."email", sp_std.standard_minutes
    ORDER BY "totalOvertimeMinutes" DESC
  `;

  const summaries = rows.map((r) => {
    const totalOvertimeMinutes = Number(r.totalOvertimeMinutes);
    return {
      userId: r.userId,
      userName: r.userName,
      totalWorkMinutes: Number(r.totalWorkMinutes),
      totalOvertimeMinutes,
      workDays: Number(r.workDays),
      exceeds36Agreement: totalOvertimeMinutes > MONTHLY_OVERTIME_LIMIT_MINUTES,
      overtimePercentage: Math.round((totalOvertimeMinutes / MONTHLY_OVERTIME_LIMIT_MINUTES) * 100),
    };
  });

  return NextResponse.json({
    ok: true,
    month,
    summaries,
    alerts: summaries.filter((s) => s.overtimePercentage >= 80),
  });
}
