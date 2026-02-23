import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { startOfJstDay } from "@/lib/time";

import { ClosePanel } from "../dashboard/ClosePanel";
import { AdminCorrections } from "./AdminCorrections";
import { AdminDailyReports } from "./AdminDailyReports";

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

  // Member count
  const memberCount = await prisma.user.count({ where: { tenantId } });

  // Today's attendance summary
  const todayEntries = await prisma.timeEntry.count({
    where: { tenantId, date: today },
  });
  const todayClockedOut = await prisma.timeEntry.count({
    where: { tenantId, date: today, clockOutAt: { not: null } },
  });

  const roleLabel = role === "ADMIN" ? "管理者" : "承認者";

  return (
    <>
      <header className="app-header">
        <h1>Workforce</h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className={`badge ${role === "ADMIN" ? "badge-closed" : "badge-pending"}`}>
            {roleLabel}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" style={{ fontSize: 13, padding: "4px 12px", minHeight: "auto" }}>
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="page-container">
        {/* Navigation */}
        <nav style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <Link href="/dashboard">← マイページ</Link>
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
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>未処理申請</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: pendingCorrections.length > 0 ? "var(--color-warning)" : undefined }}>
                {pendingCorrections.length} 件
              </div>
            </div>
          </div>
        </section>

        {/* Monthly close — ADMIN only */}
        {role === "ADMIN" && (
          <ClosePanel isAdmin={true} month={month} isClosed={!!companyClose} />
        )}

        {/* Correction approvals */}
        <AdminCorrections items={pendingCorrectionsUi} />

        {/* Submitted daily reports */}
        <AdminDailyReports items={dailyReportsUi} />
      </main>
    </>
  );
}
