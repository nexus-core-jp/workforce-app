import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { addJstDays, formatLocal, startOfJstDay } from "@/lib/time";

import { ClosePanel } from "./ClosePanel";
import { CorrectionsPanel } from "./CorrectionsPanel";
import { History } from "./History";
import { TimeClock } from "./TimeClock";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;

  const tenantId: string = user.tenantId;
  const userId: string = user.id;
  const role: string = user.role;

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

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        tenant: <b>{user.tenantId}</b> / role: <b>{user.role}</b>
      </p>

      <div style={{ marginTop: 16 }}>
        <p>
          ログイン中: <b>{user.name ?? user.email}</b>
        </p>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 8 }}>今日の打刻</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>出勤: {formatLocal(clockInAt)}</li>
          <li>休憩開始: {formatLocal(breakStartAt)}</li>
          <li>休憩終了: {formatLocal(breakEndAt)}</li>
          <li>退勤: {formatLocal(clockOutAt)}</li>
          <li>労働分（概算）: {entry?.workMinutes ?? 0} 分</li>
        </ul>
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

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Link href="/">/ (root)</Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit">ログアウト</button>
        </form>
      </div>

      <hr style={{ margin: "24px 0" }} />
      <p>次: 締めロック（Close）をUI/ APIで触れるようにする。</p>
    </main>
  );
}
