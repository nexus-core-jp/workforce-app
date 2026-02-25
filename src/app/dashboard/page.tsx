import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutWithAudit } from "@/lib/logout-action";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { addJstDays, formatLocal, startOfJstDay } from "@/lib/time";
import { calcDailyOvertime, STANDARD_DAILY_MINUTES, MONTHLY_OVERTIME_LIMIT_MINUTES } from "@/lib/overtime";

import { Logo } from "../Logo";
import { DailyReportPanel } from "./DailyReportPanel";
import { History } from "./History";
import { NotificationBell } from "./NotificationBell";
import { TimeClock } from "./TimeClock";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, id: userId, role } = user;

  if (role === "SUPER_ADMIN") redirect("/super-admin");

  // Fetch tenant for trial info
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, trialEndsAt: true },
  });

  const today = startOfJstDay(new Date());
  const entry = await prisma.timeEntry.findUnique({
    where: { tenantId_userId_date: { tenantId, userId, date: today } },
  });

  const clockInAt = entry?.clockInAt ?? null;
  const breakStartAt = entry?.breakStartAt ?? null;
  const breakEndAt = entry?.breakEndAt ?? null;
  const clockOutAt = entry?.clockOutAt ?? null;

  const canClockIn = !clockInAt;
  const canBreakStart = !!clockInAt && !clockOutAt && !breakStartAt;
  const canBreakEnd = !!breakStartAt && !breakEndAt;
  const canClockOut = !!clockInAt && !clockOutAt && (!breakStartAt || !!breakEndAt);

  // Last 7 days entries
  const from = addJstDays(today, -6);
  const history = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      userId,
      date: {
        gte: from,
        lte: today,
      },
    },
    orderBy: { date: "desc" },
  });

  const historyMap = new Map(history.map((h) => [h.date.toISOString(), h]));
  const historyItems = Array.from({ length: 7 }, (_, i) => {
    const d = addJstDays(today, -i);
    const iso = d.toISOString();
    const h = historyMap.get(iso);

    const dateLabel = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(d);

    return {
      dateLabel,
      dateYmd: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
      clockInAt: h?.clockInAt ?? null,
      breakStartAt: h?.breakStartAt ?? null,
      breakEndAt: h?.breakEndAt ?? null,
      clockOutAt: h?.clockOutAt ?? null,
      workMinutes: h?.workMinutes ?? 0,
    };
  });

  // My pending correction count
  const myPendingCount = await prisma.attendanceCorrection.count({
    where: { tenantId, userId, status: "PENDING" },
  });

  // Leave balance
  const leaveLedger = await prisma.leaveLedgerEntry.findMany({
    where: { tenantId, userId },
  });
  let leaveBalance = 0;
  for (const entry of leaveLedger) {
    const days = Number(entry.days);
    if (entry.kind === "USE") {
      leaveBalance -= days;
    } else {
      leaveBalance += days;
    }
  }

  // My pending leave requests
  const myPendingLeaves = await prisma.leaveRequest.count({
    where: { tenantId, userId, status: "PENDING" },
  });

  // Monthly overtime calculation
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(today);
  const [cYear, cMon] = currentMonth.split("-").map(Number);
  const monthStart = startOfJstDay(new Date(Date.UTC(cYear, cMon - 1, 1)));
  const monthEntries = await prisma.timeEntry.findMany({
    where: { tenantId, userId, date: { gte: monthStart, lte: today } },
  });
  let monthlyWorkMinutes = 0;
  let monthlyOvertimeMinutes = 0;
  for (const me of monthEntries) {
    monthlyWorkMinutes += me.workMinutes;
    monthlyOvertimeMinutes += calcDailyOvertime(me.workMinutes, STANDARD_DAILY_MINUTES);
  }
  const overtimePercentage = Math.round((monthlyOvertimeMinutes / MONTHLY_OVERTIME_LIMIT_MINUTES) * 100);

  const isAdminOrApprover = role === "ADMIN" || role === "APPROVER";

  // Today's daily report
  const todayYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const dailyReport = await prisma.dailyReport.findUnique({
    where: { tenantId_userId_date: { tenantId, userId, date: today } },
  });
  const dailyReportStatus: "none" | "draft" | "submitted" =
    dailyReport?.status === "SUBMITTED" ? "submitted" : dailyReport ? "draft" : "none";

  const roleLabel = role === "ADMIN" ? "管理者" : role === "APPROVER" ? "承認者" : "従業員";

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className={`badge ${role === "ADMIN" ? "badge-closed" : role === "APPROVER" ? "badge-pending" : "badge-open"}`}>
            {roleLabel}
          </span>
          <NotificationBell />
          <form
            action={async () => {
              "use server";
              await logoutWithAudit();
            }}
          >
            <button type="submit" className="btn-compact">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      {/* Trial banner */}
      {tenant?.plan === "TRIAL" && (() => {
        const now = new Date();
        const trialDays = tenant.trialEndsAt
          ? Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        if (trialDays !== null && trialDays <= 0) {
          return (
            <div className="trial-banner trial-banner-expired">
              トライアル期間が終了しました
            </div>
          );
        }
        return (
          <div className={`trial-banner ${trialDays !== null && trialDays <= 7 ? "trial-banner-warning" : ""}`}>
            トライアル残り {trialDays} 日
          </div>
        );
      })()}

      <main className="page-container">
        {/* Admin link */}
        {isAdminOrApprover && (
          <nav style={{ marginBottom: 8 }}>
            <Link href="/admin" style={{ fontWeight: 500 }}>
              管理画面 →
            </Link>
          </nav>
        )}

        <section>
          <h2 style={{ marginBottom: 12 }}>今日の打刻</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>出勤</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatLocal(clockInAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>休憩開始</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatLocal(breakStartAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>休憩終了</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatLocal(breakEndAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>退勤</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatLocal(clockOutAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>労働時間</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{entry?.workMinutes ?? 0} 分</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>今月残業</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: overtimePercentage >= 80 ? "var(--color-danger)" : overtimePercentage >= 50 ? "var(--color-warning)" : undefined }}>
                {Math.floor(monthlyOvertimeMinutes / 60)}h{monthlyOvertimeMinutes % 60}m
              </div>
            </div>
          </div>
        </section>

        <TimeClock
          canClockIn={canClockIn}
          canBreakStart={canBreakStart}
          canBreakEnd={canBreakEnd}
          canClockOut={canClockOut}
        />

        <DailyReportPanel dateYmd={todayYmd} status={dailyReportStatus} />

        <History items={historyItems} />

        {/* Leave requests */}
        <section>
          <h2 style={{ marginBottom: 12 }}>休暇</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>有休残日数: </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: leaveBalance <= 2 ? "var(--color-danger)" : "var(--color-success)" }}>
                {leaveBalance} 日
              </span>
            </div>
            {myPendingLeaves > 0 && (
              <span className="badge badge-pending">承認待ち {myPendingLeaves} 件</span>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/leave-requests/new">
                <button data-variant="primary" className="btn-compact">休暇申請</button>
              </Link>
              <Link href="/leave-requests">
                <button className="btn-compact">申請一覧</button>
              </Link>
            </div>
          </div>
        </section>

        {/* Own correction status */}
        <section>
          <h2 style={{ marginBottom: 12 }}>打刻修正申請</h2>
          <p style={{ fontSize: 14 }}>
            あなたの未処理申請: <span className="badge badge-pending">{myPendingCount} 件</span>
          </p>
        </section>
      </main>
    </>
  );
}
