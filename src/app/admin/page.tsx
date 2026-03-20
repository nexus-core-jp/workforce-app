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
import { isFaceAuthAvailable } from "@/lib/face-auth-config";
import { LeaveBalanceReport } from "./LeaveBalanceReport";
import { MobileNav } from "./MobileNav";
import { OvertimePanel } from "./OvertimePanel";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, role } = user;

  // Only ADMIN can access this page
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  const today = startOfJstDay(new Date());
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(today);

  // Parallelize independent DB queries for performance
  const [
    tenant,
    companyClose,
    pendingCorrections,
    recentDailyReports,
    pendingLeaves,
    memberCount,
    todayEntries,
    todayClockedOut,
    allMembers,
    todayTimeEntries,
    todayLeaves,
    allLedgerEntries,
  ] = await Promise.all([
    // Fetch tenant for trial info, face auth, and slug
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, trialEndsAt: true, faceAuthEnabled: true, slug: true },
    }),
    // Monthly close status (ADMIN only)
    role === "ADMIN"
      ? prisma.close.findUnique({
          where: {
            tenantId_month_scope_departmentId: {
              tenantId,
              month,
              scope: "COMPANY",
              departmentId: "",
            },
          },
        })
      : Promise.resolve(null),
    // Pending correction requests
    prisma.attendanceCorrection.findMany({
      where: { tenantId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: true },
    }),
    // Recent submitted daily reports
    prisma.dailyReport.findMany({
      where: { tenantId, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
    // Pending leave requests
    prisma.leaveRequest.findMany({
      where: { tenantId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: true },
    }),
    // Member count
    prisma.user.count({ where: { tenantId } }),
    // Today's attendance
    prisma.timeEntry.count({ where: { tenantId, date: today } }),
    prisma.timeEntry.count({ where: { tenantId, date: today, clockOutAt: { not: null } } }),
    // All active members
    prisma.user.findMany({
      where: { tenantId, active: true, role: { not: "SUPER_ADMIN" } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    // Today's time entries
    prisma.timeEntry.findMany({ where: { tenantId, date: today } }),
    // Today's approved leaves
    prisma.leaveRequest.findMany({
      where: { tenantId, status: "APPROVED", startAt: { lte: today }, endAt: { gte: today } },
      select: { userId: true },
    }),
    // Leave ledger for balance report
    prisma.leaveLedgerEntry.findMany({ where: { tenantId } }),
  ]);

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

  const todayTimeMap = new Map(todayTimeEntries.map((e) => [e.userId, e]));
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
    tenant?.faceAuthEnabled
      ? (
          await prisma.faceDescriptor.groupBy({
            by: ["userId"],
            where: { tenantId },
          })
        ).length
      : 0;

  const roleLabel = "管理者";

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className="badge badge-closed">
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
        <MobileNav
          role={role}
          links={[
            { href: "/dashboard", label: "← マイページ" },
            { href: "/admin/members", label: "メンバー管理", adminOnly: true },
            { href: "/admin/departments", label: "部署管理", adminOnly: true },
            { href: "/admin/shifts", label: "シフト管理", adminOnly: true },
            { href: "/admin/payroll", label: "給与設定", adminOnly: true },
            { href: "/admin/payroll/calc", label: "給与計算", adminOnly: true },
            { href: "/admin/holidays", label: "休日カレンダー", adminOnly: true },
            { href: "/admin/billing", label: "プラン・請求", adminOnly: true },
            { href: "/admin/audit-logs", label: "監査ログ", adminOnly: true },
          ]}
        />

        {/* Overview cards */}
        <section>
          <h2 style={{ marginBottom: 16 }}>本日の概況</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <div className="stat-card">
              <div className="stat-label">メンバー数</div>
              <div className="stat-value">{memberCount} 名</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">本日出勤</div>
              <div className="stat-value">{todayEntries} 名</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">退勤済み</div>
              <div className="stat-value">{todayClockedOut} 名</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">未処理修正</div>
              <div className="stat-value" style={{ color: pendingCorrections.length > 0 ? "var(--color-warning)" : undefined }}>
                {pendingCorrections.length} 件
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">未処理休暇</div>
              <div className="stat-value" style={{ color: pendingLeaves.length > 0 ? "var(--color-warning)" : undefined }}>
                {pendingLeaves.length} 件
              </div>
            </div>
          </div>
        </section>

        {/* Today's attendance status */}
        <AttendanceStatus items={attendanceStatusItems} />

        {/* Monthly close */}
        <ClosePanel isAdmin={true} month={month} isClosed={!!companyClose} />

        {/* Overtime Report */}
        <OvertimePanel defaultMonth={month} />

        {/* Leave balance report */}
        <LeaveBalanceReport items={leaveBalanceItems} />

        {/* CSV Export */}
        <ExportPanel defaultMonth={month} />

        {/* Leave request approvals */}
        <AdminLeaveRequests items={pendingLeavesUi} />

        {/* Correction approvals */}
        <AdminCorrections items={pendingCorrectionsUi} />

        {/* Submitted daily reports */}
        <AdminDailyReports items={dailyReportsUi} />

        {/* Face auth toggle (ADMIN only) */}
        {role === "ADMIN" && tenant && (
          <FaceAuthToggle
            available={isFaceAuthAvailable()}
            enabled={tenant.faceAuthEnabled}
            kioskUrl={`/kiosk/${tenant.slug}`}
            registeredUsers={faceAuthRegisteredUsers}
            totalUsers={allMembers.length}
          />
        )}
      </main>
    </>
  );
}
