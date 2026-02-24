import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { toSessionUser } from "@/lib/session";
import { calculateMonthlyPayroll, generateZenginCsv } from "@/lib/payroll";

const querySchema = z.object({
  type: z.enum(["payroll", "bank-transfer", "payroll-detail"]),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return jsonError("Unauthorized", 401);

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const { tenantId } = user;
  const url = new URL(req.url);
  const raw = {
    type: url.searchParams.get("type"),
    month: url.searchParams.get("month"),
  };

  const input = querySchema.safeParse(raw);
  if (!input.success) return jsonError(input.error.message);

  const { type, month } = input.data;
  const [year, mon] = month.split("-").map(Number);
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(year, mon - 1, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(year, mon, 1) - JST_OFFSET_MS);

  // Get configs and entries
  const configs = await prisma.payrollConfig.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true, email: true, active: true } } },
  });

  const entries = await prisma.timeEntry.findMany({
    where: { tenantId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  const entriesByUser = new Map<string, typeof entries>();
  for (const entry of entries) {
    const arr = entriesByUser.get(entry.userId) ?? [];
    arr.push(entry);
    entriesByUser.set(entry.userId, arr);
  }

  // Calculate payroll for each user
  const payrolls = configs
    .filter((c) => c.user.active)
    .map((cfg) => {
      const userEntries = entriesByUser.get(cfg.userId) ?? [];
      const result = calculateMonthlyPayroll(
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
      return { cfg, result };
    });

  if (type === "bank-transfer") {
    // 全銀フォーマットCSV
    const bankData = payrolls
      .filter((p) => p.cfg.bankCode && p.cfg.accountNumber && p.result.netPay > 0)
      .map((p) => ({
        bankCode: p.cfg.bankCode ?? "",
        branchCode: p.cfg.branchCode ?? "",
        accountType: p.cfg.accountType ?? "普通",
        accountNumber: p.cfg.accountNumber ?? "",
        accountHolder: p.cfg.accountHolder ?? p.cfg.user.name ?? "",
        amount: p.result.netPay,
      }));

    const csv = generateZenginCsv(bankData);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bank_transfer_${month}.csv"`,
      },
    });
  }

  if (type === "payroll-detail") {
    // Detailed per-day breakdown CSV
    const headers = [
      "社員名", "メール", "日付", "曜日", "休日",
      "労働時間(分)", "所定時間(分)", "残業(分)", "深夜(分)", "休日労働(分)",
    ];
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const rows: unknown[][] = [];

    for (const p of payrolls) {
      for (const day of p.result.dailyBreakdown) {
        rows.push([
          p.cfg.user.name ?? "",
          p.cfg.user.email,
          day.date,
          dayNames[day.dayOfWeek],
          day.isHoliday ? "休日" : "",
          day.workMinutes,
          day.scheduledMinutes,
          day.overtimeMinutes,
          day.lateNightMinutes,
          day.holidayMinutes,
        ]);
      }
    }

    const csv = toCsv(headers, rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll_detail_${month}.csv"`,
      },
    });
  }

  // Default: payroll summary CSV
  const headers = [
    "社員名", "メール", "給与形態",
    "出勤日数", "欠勤日数",
    "総労働時間(分)", "所定内(分)", "残業(分)", "深夜(分)", "休日(分)",
    "基本給", "残業手当", "深夜手当", "休日手当",
    "通勤手当", "その他手当", "総支給額", "控除合計", "差引支給額",
  ];
  const payTypeLabels: Record<string, string> = {
    MONTHLY: "月給", HOURLY: "時給", DAILY: "日給",
  };
  const rows = payrolls.map((p) => [
    p.cfg.user.name ?? "",
    p.cfg.user.email,
    payTypeLabels[p.cfg.payType] ?? p.cfg.payType,
    p.result.workDays,
    p.result.absentDays,
    p.result.totalWorkMinutes,
    p.result.scheduledMinutes,
    p.result.overtimeMinutes,
    p.result.lateNightMinutes,
    p.result.holidayMinutes,
    p.result.basePay,
    p.result.overtimePay,
    p.result.lateNightPay,
    p.result.holidayPay,
    p.result.commuteAllowance,
    p.result.otherAllowances,
    p.result.grossPay,
    p.result.deductions,
    p.result.netPay,
  ]);

  const csv = toCsv(headers, rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll_${month}.csv"`,
    },
  });
}
