import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { HISTORY_DAYS, LOCALE, DATE_LOCALE, TIMEZONE, PENDING_CORRECTIONS_LIMIT } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { addJstDays, formatTimeOnly, startOfJstDay } from "@/lib/time";

import { DashboardClient } from "./DashboardClient";
import { History } from "./History";
import styles from "./dashboard.module.css";

function getWorkStatus(
  clockInAt: Date | null,
  breakStartAt: Date | null,
  breakEndAt: Date | null,
  clockOutAt: Date | null,
): { label: string; className: string } {
  if (!clockInAt) return { label: "\u672a\u51fa\u52e4", className: styles.statusNotStarted };
  if (clockOutAt) return { label: "\u9000\u52e4\u6e08\u307f", className: styles.statusDone };
  if (breakStartAt && !breakEndAt) return { label: "\u4f11\u61a9\u4e2d", className: styles.statusOnBreak };
  return { label: "\u52e4\u52d9\u4e2d", className: styles.statusWorking };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, tenantId, role, name, email } = session.user;

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

  const status = getWorkStatus(clockInAt, breakStartAt, breakEndAt, clockOutAt);

  const from = addJstDays(today, -(HISTORY_DAYS - 1));
  const history = await prisma.timeEntry.findMany({
    where: { tenantId, userId, date: { gte: from, lte: today } },
    orderBy: { date: "desc" },
  });

  const historyMap = new Map(history.map((h) => [h.date.toISOString(), h]));
  const historyItems = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const d = addJstDays(today, -i);
    const iso = d.toISOString();
    const h = historyMap.get(iso);

    const dateLabel = new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIMEZONE,
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(d);

    return {
      dateLabel,
      dateYmd: new Intl.DateTimeFormat(DATE_LOCALE, {
        timeZone: TIMEZONE,
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

  const myPendingCount = await prisma.attendanceCorrection.count({
    where: { tenantId, userId, status: "PENDING" },
  });

  const isAdminOrApprover = role === "ADMIN" || role === "APPROVER";

  const month = new Intl.DateTimeFormat(DATE_LOCALE, { timeZone: TIMEZONE, year: "numeric", month: "2-digit" }).format(today);
  const companyClose = await prisma.close.findUnique({
    where: { tenantId_month_scope_departmentId: { tenantId, month, scope: "COMPANY", departmentId: "" } },
  });
  const isClosed = !!companyClose;

  const pendingForApproval = isAdminOrApprover
    ? await prisma.attendanceCorrection.findMany({
        where: { tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: PENDING_CORRECTIONS_LIMIT,
        include: { user: true },
      })
    : [];

  const pendingForApprovalUi = pendingForApproval.map((p) => ({
    id: p.id,
    userLabel: p.user.name ?? p.user.email,
    dateLabel: new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIMEZONE,
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(p.date),
    reason: p.reason,
  }));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Workforce</h1>
          <p className={styles.userInfo}>
            {name ?? email} / {role === "ADMIN" ? "\u7ba1\u7406\u8005" : role === "APPROVER" ? "\u627f\u8a8d\u8005" : "\u4e00\u822c"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit">\u30ed\u30b0\u30a2\u30a6\u30c8</button>
          </form>
        </div>
      </header>

      {/* Today's status card */}
      <div className={styles.statusCard}>
        <div className={styles.statusHeader}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>\u4eca\u65e5\u306e\u52e4\u6020</h2>
          <span className={`${styles.statusBadge} ${status.className}`}>
            {status.label}
          </span>
        </div>
        <div className={styles.todayTimes}>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>\u51fa\u52e4</span>
            <span className={styles.timeValue}>{formatTimeOnly(clockInAt)}</span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>\u4f11\u61a9\u958b\u59cb</span>
            <span className={styles.timeValue}>{formatTimeOnly(breakStartAt)}</span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>\u4f11\u61a9\u7d42\u4e86</span>
            <span className={styles.timeValue}>{formatTimeOnly(breakEndAt)}</span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>\u9000\u52e4</span>
            <span className={styles.timeValue}>{formatTimeOnly(clockOutAt)}</span>
          </div>
          <div className={styles.timeItem}>
            <span className={styles.timeLabel}>\u52b4\u50cd\u6642\u9593</span>
            <span className={styles.timeValue}>
              {entry?.workMinutes
                ? `${Math.floor(entry.workMinutes / 60)}\u6642\u9593${entry.workMinutes % 60}\u5206`
                : "-"}
            </span>
          </div>
        </div>
      </div>

      <DashboardClient
        canClockIn={canClockIn}
        canBreakStart={canBreakStart}
        canBreakEnd={canBreakEnd}
        canClockOut={canClockOut}
        isAdminOrApprover={isAdminOrApprover}
        pendingCount={myPendingCount}
        pendingForApproval={pendingForApprovalUi}
        isAdmin={role === "ADMIN"}
        month={month}
        isClosed={isClosed}
      />

      <History items={historyItems} />
    </main>
  );
}
