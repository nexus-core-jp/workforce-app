import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { calculateMonthlyPayroll } from "@/lib/payroll";

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  confirm: z.boolean().optional(),
});

/** POST: Calculate (or confirm) payroll for a month */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const actor = toSessionUser(session.user as Record<string, unknown>);
  if (!actor || actor.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { tenantId } = actor;

  const raw = await req.json().catch(() => null);
  const input = schema.safeParse(raw);
  if (!input.success) return jsonError(input.error.issues.map((e) => e.message).join(", "));

  const { month, confirm } = input.data;

  // Get all payroll configs for this tenant
  const configs = await prisma.payrollConfig.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true, email: true, active: true } } },
  });

  if (configs.length === 0) {
    return jsonError("給与設定が登録されていません。先に給与設定を行ってください。");
  }

  // Build date range for the month
  const [year, mon] = month.split("-").map(Number);
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(year, mon - 1, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(year, mon, 1) - JST_OFFSET_MS);

  // Get all time entries for the month
  const allEntries = await prisma.timeEntry.findMany({
    where: { tenantId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  // Group by user
  const entriesByUser = new Map<string, typeof allEntries>();
  for (const entry of allEntries) {
    const arr = entriesByUser.get(entry.userId) ?? [];
    arr.push(entry);
    entriesByUser.set(entry.userId, arr);
  }

  const results: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    payroll: ReturnType<typeof calculateMonthlyPayroll>;
  }> = [];

  for (const cfg of configs) {
    if (!cfg.user.active) continue;

    const userEntries = entriesByUser.get(cfg.userId) ?? [];
    const payroll = calculateMonthlyPayroll(
      userEntries.map((e) => ({
        date: e.date,
        clockInAt: e.clockInAt,
        clockOutAt: e.clockOutAt,
        breakStartAt: e.breakStartAt,
        breakEndAt: e.breakEndAt,
        workMinutes: e.workMinutes,
      })),
      {
        payType: cfg.payType,
        baseSalary: cfg.baseSalary,
        hourlyRate: cfg.hourlyRate,
        commuteAllowance: cfg.commuteAllowance,
        housingAllowance: cfg.housingAllowance,
        familyAllowance: cfg.familyAllowance,
        otherAllowance: cfg.otherAllowance,
        scheduledWorkDays: cfg.scheduledWorkDays,
        scheduledWorkMinutes: cfg.scheduledWorkMinutes,
        overtimeRate: Number(cfg.overtimeRate),
        lateNightRate: Number(cfg.lateNightRate),
        holidayRate: Number(cfg.holidayRate),
      },
      month,
    );

    results.push({
      userId: cfg.userId,
      userName: cfg.user.name ?? "",
      userEmail: cfg.user.email,
      payroll,
    });
  }

  // If confirm=true, save to MonthlyPayroll table
  if (confirm) {
    for (const r of results) {
      const p = r.payroll;
      await prisma.monthlyPayroll.upsert({
        where: { tenantId_userId_month: { tenantId, userId: r.userId, month } },
        create: {
          tenantId,
          userId: r.userId,
          month,
          totalWorkMinutes: p.totalWorkMinutes,
          scheduledMinutes: p.scheduledMinutes,
          overtimeMinutes: p.overtimeMinutes,
          lateNightMinutes: p.lateNightMinutes,
          holidayMinutes: p.holidayMinutes,
          workDays: p.workDays,
          absentDays: p.absentDays,
          basePay: p.basePay,
          overtimePay: p.overtimePay,
          lateNightPay: p.lateNightPay,
          holidayPay: p.holidayPay,
          commuteAllowance: p.commuteAllowance,
          otherAllowances: p.otherAllowances,
          grossPay: p.grossPay,
          deductions: p.deductions,
          netPay: p.netPay,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
        update: {
          totalWorkMinutes: p.totalWorkMinutes,
          scheduledMinutes: p.scheduledMinutes,
          overtimeMinutes: p.overtimeMinutes,
          lateNightMinutes: p.lateNightMinutes,
          holidayMinutes: p.holidayMinutes,
          workDays: p.workDays,
          absentDays: p.absentDays,
          basePay: p.basePay,
          overtimePay: p.overtimePay,
          lateNightPay: p.lateNightPay,
          holidayPay: p.holidayPay,
          commuteAllowance: p.commuteAllowance,
          otherAllowances: p.otherAllowances,
          grossPay: p.grossPay,
          deductions: p.deductions,
          netPay: p.netPay,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId: actor.id,
        action: "PAYROLL_CONFIRMED",
        entityType: "MonthlyPayroll",
        entityId: month,
        afterJson: {
          month,
          employeeCount: results.length,
          totalGross: results.reduce((s, r) => s + r.payroll.grossPay, 0),
        },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    month,
    confirmed: !!confirm,
    results: results.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      ...r.payroll,
    })),
  });
}
