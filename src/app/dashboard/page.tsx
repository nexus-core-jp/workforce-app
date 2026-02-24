import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { addJstDays, formatLocal, startOfJstDay } from "@/lib/time";

import { Logo } from "../Logo";
import { DailyReportPanel } from "./DailyReportPanel";
import { History } from "./History";
import { TimeClock } from "./TimeClock";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, id: userId, role } = user;

  if (role === "SUPER_ADMIN") redirect("/super-admin");

  const today = startOfJstDay(new Date());
  const from = addJstDays(today, -6);

  // Parallelize independent DB queries for faster page load
  const [tenant, entry, history, myPendingCount, dailyReport] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true },
    }),
    prisma.timeEntry.findUnique({
      where: { tenantId_userId_date: { tenantId, userId, date: today } },
    }),
    prisma.timeEntry.findMany({
      where: { tenantId, userId, date: { gte: from, lte: today } },
      orderBy: { date: "desc" },
    }),
    prisma.attendanceCorrection.count({
      where: { tenantId, userId, status: "PENDING" },
    }),
    prisma.dailyReport.findUnique({
      where: { tenantId_userId_date: { tenantId, userId, date: today } },
    }),
  ]);

  const clockInAt = entry?.clockInAt ?? null;
  const breakStartAt = entry?.breakStartAt ?? null;
  const breakEndAt = entry?.breakEndAt ?? null;
  const clockOutAt = entry?.clockOutAt ?? null;

  const canClockIn = !clockInAt;
  const canBreakStart = !!clockInAt && !clockOutAt && !breakStartAt;
  const canBreakEnd = !!breakStartAt && !breakEndAt;
  const canClockOut = !!clockInAt && !clockOutAt && (!breakStartAt || !!breakEndAt);

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

  const isAdminOrApprover = role === "ADMIN" || role === "APPROVER";

  const todayYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
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
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
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
        const trialDays = tenant.trialEndsAt
          ? Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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
