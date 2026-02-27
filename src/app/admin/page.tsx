import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutWithAudit } from "@/lib/logout-action";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { startOfJstDay } from "@/lib/time";

import { ClosePanel } from "../dashboard/ClosePanel";
import { NotificationBell } from "../dashboard/NotificationBell";
import { Logo } from "../Logo";
import { AdminCorrections } from "./AdminCorrections";
import { AdminDailyReports } from "./AdminDailyReports";
import { AdminLeaveRequests } from "./AdminLeaveRequests";
import { AttendanceStatus } from "./AttendanceStatus";
import { ExportPanel } from "./ExportPanel";
import { FaceAuthToggle } from "./FaceAuthToggle";
import { LeaveBalanceReport } from "./LeaveBalanceReport";
import { OvertimePanel } from "./OvertimePanel";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, role } = user;

  // Only ADMIN and APPROVER can access this page
  if (role !== "ADMIN" && role !== "APPROVER") {
    redirect("/dashboard");
  }

  // Fetch tenant for trial info and face auth
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, trialEndsAt: true, faceAuthEnabled: true },
  });

  const today = startOfJstDay(new Date());
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(today);

  // Monthly close status (ADMIN only)
  const companyClose =
    role === "ADMIN"
      ? await prisma.close.findUnique({
          where: {
            tenantId_month_scope_departmentId: {
              tenantId,
              month,
              scope: "COMPANY",
              departmentId: "",
            },
          },
        })
      : null;

  // Pending correction requests
  const pendingCorrections = await prisma.attendanceCorrection.findMany({
    where: { tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true },
  });

  const pendingCorrectionsUi = pendingCorrections.map((p) => ({
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

  // Recent submitted daily reports
  const recentDailyReports = await prisma.dailyReport.findMany({
    where: { tenantId, status: "SUBMITTED" },
    orderBy: { submittedAt: "desc" },
    take: 20,
    include: { user: { select: { name: true, email: true } } },
  });

  const dailyReportsUi = recentDailyReports.map((r) => ({
    id: r.id,
    userLabel: r.user.name ?? r.user.email,
    dateLabel: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).format(r.date),
    route: r.route,
    cases: r.cases,
    submittedAt: r.submittedAt
      ? new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(r.submittedAt)
      : null,
  }));

  // Pending leave requests
  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: { tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true },
  });

  const pendingLeavesUi = pendingLeaves.map((p) => ({
    id: p.id,
    userLabel: p.user.name ?? p.user.email,
    type: p.type,
    startAt: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(p.startAt),
    endAt: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(p.endAt),
    reason: p.reason ?? "",
  }));

  // Member count
  const memberCount = await prisma.user.count({ where: { tenantId } });

  // Today's attendance summary
  const todayEntries = await prisma.timeEntry.count({
    where: { tenantId, date: today },
  });
  const todayClockedOut = await prisma.timeEntry.count({
    where: { tenantId, date: today, clockOutAt: { not: null } },
  });

  // Detailed attendance status for today
  const allMembers = await prisma.user.findMany({
    where: { tenantId, active: true, role: { not: "SUPER_ADMIN" } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const todayTimeEntries = await prisma.timeEntry.findMany({
    where: { tenantId, date: today },
  });
  const todayTimeMap = new Map(todayTimeEntries.map((e) => [e.userId, e]));

  // Today's approved leave requests
  const todayLeaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startAt: { lte: today },
      endAt: { gte: today },
    },
    select: { userId: true },
  });
  const onLeaveUserIds = new Set(todayLeaves.map((l) => l.userId));

  const formatTimeShort = (dt: Date | null) => {
    if (!dt) return null;
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dt);
  };

  const attendanceStatusItems = allMembers.map((m) => {
    const entry = todayTimeMap.get(m.id);
    const isOnLeave = onLeaveUserIds.has(m.id);

    let status: "working" | "on_break" | "clocked_out" | "not_clocked_in" | "on_leave";
    if (isOnLeave && !entry) {
      status = "on_leave";
    } else if (!entry || !entry.clockInAt) {
      status = "not_clocked_in";
    } else if (entry.clockOutAt) {
      status = "clocked_out";
    } else if (entry.breakStartAt && !entry.breakEndAt) {
      status = "on_break";
    } else {
      status = "working";
    }

    return {
      name: m.name ?? m.email,
      status,
      clockInAt: entry ? formatTimeShort(entry.clockInAt) : null,
      clockOutAt: entry ? formatTimeShort(entry.clockOutAt) : null,
    };
  });

  // Leave balance report
  const allLedgerEntries = await prisma.leaveLedgerEntry.findMany({
    where: { tenantId },
  });

  const leaveBalanceItems = allMembers.map((m) => {
    const entries = allLedgerEntries.filter((e) => e.userId === m.id);
    let granted = 0;
    let used = 0;
    for (const e of entries) {
      const days = Number(e.days);
      if (e.kind === "USE") {
        used += days;
      } else {
        granted += days;
      }
    }
    const balance = granted - used;
    const consumptionRate = granted > 0 ? Math.round((used / granted) * 100) : 0;
    return {
      name: m.name ?? m.email,
      granted,
      used,
      balance,
      consumptionRate,
    };
  });

  // Face auth: count of users with registered descriptors (ADMIN only)
  const faceAuthRegisteredUsers =
    role === "ADMIN" && tenant?.faceAuthEnabled
      ? (
          await prisma.faceDescriptor.groupBy({
            by: ["userId"],
            where: { tenantId },
          })
        ).length
      : 0;

  const roleLabel = role === "ADMIN" ? "管理者" : "承認者";

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className={`badge ${role === "ADMIN" ? "badge-closed" : "badge-pending"}`}>
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
        {/* Navigation */}
        <nav style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard">← マイページ</Link>
          {role === "ADMIN" && <Link href="/admin/members">メンバー管理</Link>}
          {role === "ADMIN" && <Link href="/admin/shifts">シフト管理</Link>}
          {role === "ADMIN" && <Link href="/admin/billing">プラン・請求</Link>}
          {role === "ADMIN" && <Link href="/admin/audit-logs">監査ログ</Link>}
        </nav>

        {/* Overview cards */}
        <section>
          <h2 style={{ marginBottom: 12 }}>本日の概況</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>メンバー数</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{memberCount} 名</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>本日出勤</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{todayEntries} 名</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>退勤済み</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{todayClockedOut} 名</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>未処理修正</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: pendingCorrections.length > 0 ? "var(--color-warning)" : undefined }}>
                {pendingCorrections.length} 件
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>未処理休暇</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: pendingLeaves.length > 0 ? "var(--color-warning)" : undefined }}>
                {pendingLeaves.length} 件
              </div>
            </div>
          </div>
        </section>

        {/* Today's attendance status */}
        <AttendanceStatus items={attendanceStatusItems} />

        {/* Monthly close — ADMIN only */}
        {role === "ADMIN" && (
          <ClosePanel isAdmin={true} month={month} isClosed={!!companyClose} />
        )}

        {/* Overtime Report */}
        <OvertimePanel defaultMonth={month} />

        {/* Leave balance report */}
        <LeaveBalanceReport items={leaveBalanceItems} />

        {/* CSV Export */}
        <ExportPanel defaultMonth={month} />

        {/* Face Auth Toggle — ADMIN only */}
        {role === "ADMIN" && (
          <FaceAuthToggle
            enabled={tenant?.faceAuthEnabled ?? false}
            registeredUsers={faceAuthRegisteredUsers}
            totalUsers={allMembers.length}
          />
        )}

        {/* Leave request approvals */}
        <AdminLeaveRequests items={pendingLeavesUi} />

        {/* Correction approvals */}
        <AdminCorrections items={pendingCorrectionsUi} />

        {/* Submitted daily reports */}
        <AdminDailyReports items={dailyReportsUi} />
      </main>
    </>
  );
}
