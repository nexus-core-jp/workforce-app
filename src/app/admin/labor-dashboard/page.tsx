import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { calculateMonthlyPayroll } from "@/lib/payroll";
import { toSessionUser } from "@/lib/session";
import { startOfJstDay } from "@/lib/time";

import { LaborTrendChart } from "./LaborTrendChart";

/**
 * 過去6ヶ月の会社全体の労働時間トレンドと、当月の36協定アラート一覧を表示。
 */
export default async function LaborDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const { tenantId } = user;

  const today = startOfJstDay(new Date());
  const JST = "Asia/Tokyo";
  const monthFmt = new Intl.DateTimeFormat("en-CA", { timeZone: JST, year: "numeric", month: "2-digit" });

  // Build list of 6 month strings (YYYY-MM), oldest first
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCMonth(d.getUTCMonth() - i);
    months.push(monthFmt.format(d));
  }

  // Fetch configs, entries spanning 6 months, and tenant holidays
  const earliestStart = (() => {
    const [y, m] = months[0].split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1) - 9 * 60 * 60 * 1000);
  })();
  const latestEnd = (() => {
    const [y, m] = months[months.length - 1].split("-").map(Number);
    return new Date(Date.UTC(y, m, 1) - 9 * 60 * 60 * 1000);
  })();

  const [configs, entries, tenantHolidays, depts] = await Promise.all([
    prisma.payrollConfig.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true, departmentId: true, active: true } } },
    }),
    prisma.timeEntry.findMany({
      where: { tenantId, date: { gte: earliestStart, lt: latestEnd } },
      select: {
        userId: true,
        date: true,
        clockInAt: true,
        clockOutAt: true,
        breakStartAt: true,
        breakEndAt: true,
        workMinutes: true,
      },
    }),
    prisma.tenantHoliday.findMany({ where: { tenantId } }),
    prisma.department.findMany({ where: { tenantId } }),
  ]);

  const activeConfigs = configs.filter((c) => c.user.active);
  const deptById = new Map(depts.map((d) => [d.id, d.name]));

  // Compute per-month aggregates
  const monthlyTotals = months.map((month) => {
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1) - 9 * 60 * 60 * 1000);
    const end = new Date(Date.UTC(year, mon, 1) - 9 * 60 * 60 * 1000);

    let totalWork = 0;
    let totalOvertime = 0;
    let totalLateNight = 0;
    let totalHoliday = 0;
    const alerts: Array<{ userLabel: string; deptLabel: string; hours: number; level: "warn" | "over45" | "over80" }> = [];

    const customHolidays: string[] = [];
    for (const h of tenantHolidays) {
      const d = new Intl.DateTimeFormat("en-CA", { timeZone: JST, year: "numeric", month: "2-digit", day: "2-digit" }).format(h.date);
      customHolidays.push(d);
      if (h.recurring) {
        const md = new Intl.DateTimeFormat("en-CA", { timeZone: JST, month: "2-digit", day: "2-digit" }).format(h.date);
        customHolidays.push(`${year}-${md}`);
      }
    }

    for (const cfg of activeConfigs) {
      const userEntries = entries
        .filter((e) => e.userId === cfg.userId && e.date >= start && e.date < end)
        .map((e) => ({
          date: e.date,
          clockInAt: e.clockInAt,
          clockOutAt: e.clockOutAt,
          breakStartAt: e.breakStartAt,
          breakEndAt: e.breakEndAt,
          workMinutes: e.workMinutes,
        }));

      if (userEntries.length === 0) continue;

      const result = calculateMonthlyPayroll(
        userEntries,
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
        customHolidays,
      );

      totalWork += result.totalWorkMinutes;
      totalOvertime += result.overtimeMinutes;
      totalLateNight += result.lateNightMinutes;
      totalHoliday += result.holidayMinutes;

      // Latest month only: collect alerts
      if (month === months[months.length - 1]) {
        const overtimeHours = result.overtimeMinutes / 60;
        if (overtimeHours > 30) {
          const level: "warn" | "over45" | "over80" =
            overtimeHours > 80 ? "over80" : overtimeHours > 45 ? "over45" : "warn";
          alerts.push({
            userLabel: cfg.user.name ?? cfg.user.email,
            deptLabel: cfg.user.departmentId ? deptById.get(cfg.user.departmentId) ?? "—" : "—",
            hours: Math.round(overtimeHours * 10) / 10,
            level,
          });
        }
      }
    }

    return {
      month,
      totalWorkHours: Math.round(totalWork / 60),
      totalOvertimeHours: Math.round(totalOvertime / 60),
      totalLateNightHours: Math.round(totalLateNight / 60),
      totalHolidayHours: Math.round(totalHoliday / 60),
      alerts,
    };
  });

  const currentMonth = monthlyTotals[monthlyTotals.length - 1];

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/admin">← 管理画面に戻る</Link>
      </div>
      <h1>労働時間ダッシュボード</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
        直近6ヶ月の労働時間トレンドと、36協定超過者の一覧
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>月別推移(時間)</h2>
        <LaborTrendChart data={monthlyTotals.map((m) => ({
          label: m.month,
          work: m.totalWorkHours,
          overtime: m.totalOvertimeHours,
          lateNight: m.totalLateNightHours,
          holiday: m.totalHolidayHours,
        }))} />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>当月({currentMonth.month})サマリ</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <StatCard label="総労働時間" value={`${currentMonth.totalWorkHours}h`} />
          <StatCard label="時間外" value={`${currentMonth.totalOvertimeHours}h`} />
          <StatCard label="深夜" value={`${currentMonth.totalLateNightHours}h`} />
          <StatCard label="休日労働" value={`${currentMonth.totalHolidayHours}h`} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>
          36協定アラート ({currentMonth.alerts.length}名)
        </h2>
        {currentMonth.alerts.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            当月、残業30時間超の従業員はいません。
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>従業員</th>
                  <th>部門</th>
                  <th>月間残業</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {currentMonth.alerts
                  .sort((a, b) => b.hours - a.hours)
                  .map((a, i) => (
                    <tr key={i}>
                      <td>{a.userLabel}</td>
                      <td>{a.deptLabel}</td>
                      <td>{a.hours}h</td>
                      <td>
                        {a.level === "over80" && (
                          <span style={{ color: "var(--color-danger)", fontWeight: 700 }}>
                            過労死ライン超過
                          </span>
                        )}
                        {a.level === "over45" && (
                          <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                            36協定上限超過
                          </span>
                        )}
                        {a.level === "warn" && (
                          <span style={{ color: "var(--color-warning)" }}>要注意</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        background: "var(--color-surface)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
