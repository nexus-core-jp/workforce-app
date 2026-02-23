import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { addJstDays, formatLocal, startOfJstDay } from "@/lib/time";

import { ClosePanel } from "./ClosePanel";
import { CorrectionsPanel } from "./CorrectionsPanel";
import { History } from "./History";
import { TimeClock } from "./TimeClock";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, id: userId, role } = user;

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

  // Corrections (MVP)
  const myPendingCount = await prisma.attendanceCorrection.count({
    where: { tenantId, userId, status: "PENDING" },
  });

  const isAdminOrApprover = role === "ADMIN" || role === "APPROVER";

  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).format(today);
  const companyClose = await prisma.close.findUnique({ where: { tenantId_month_scope_departmentId: { tenantId, month, scope: "COMPANY", departmentId: "" } } });
  const isClosed = !!companyClose;

  const pendingForApproval = isAdminOrApprover
    ? await prisma.attendanceCorrection.findMany({
        where: { tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: true },
      })
    : [];

  const pendingForApprovalUi = pendingForApproval.map((p) => ({
    id: p.id,
    userLabel: p.user.name ?? p.user.email,
    dateLabel: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(p.date),
    reason: p.reason,
  }));

  const roleLabel = role === "ADMIN" ? "管理者" : role === "APPROVER" ? "承認者" : "従業員";

  return (
    <>
      <header className="app-header">
        <h1>Workforce</h1>
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
            <button type="submit" style={{ fontSize: 13, padding: "4px 12px" }}>
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="page-container">
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

        <History items={historyItems} />

        <CorrectionsPanel
          isAdminOrApprover={isAdminOrApprover}
          pendingCount={myPendingCount}
          pendingForApproval={pendingForApprovalUi}
        />

        <ClosePanel isAdmin={role === "ADMIN"} month={month} isClosed={isClosed} />
      </main>
    </>
  );
}
