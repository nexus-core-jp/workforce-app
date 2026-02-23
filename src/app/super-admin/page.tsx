import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { startOfJstDay } from "@/lib/time";

import { Logo } from "../Logo";
import { KpiCards } from "./KpiCards";
import { KpiCharts } from "./KpiCharts";

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: "__platform" } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true } } },
  });

  const now = new Date();
  const today = startOfJstDay(now);

  // --- KPI aggregations ---
  const tenantCount = tenants.length;
  const totalUsers = await prisma.user.count({
    where: { tenant: { slug: { not: "__platform" } } },
  });

  // Today's active users (users who have a TimeEntry for today)
  const todayActive = await prisma.timeEntry.groupBy({
    by: ["userId"],
    where: { date: today },
  }).then((r) => r.length);

  // Trial tenants expiring within 7 days
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const trialExpiringSoon = await prisma.tenant.count({
    where: {
      slug: { not: "__platform" },
      plan: "TRIAL",
      trialEndsAt: { lte: sevenDaysLater },
    },
  });

  // Monthly registrations (past 6 months)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const recentTenants = await prisma.tenant.findMany({
    where: { slug: { not: "__platform" }, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  });

  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, 0);
  }
  for (const t of recentTenants) {
    const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
    }
  }
  const monthlyRegistrations = [...monthlyMap.entries()].map(([month, count]) => ({ month, count }));

  // Plan distribution
  const planCounts = await prisma.tenant.groupBy({
    by: ["plan"],
    where: { slug: { not: "__platform" } },
    _count: { _all: true },
  });
  const planDistribution = planCounts.map((p) => ({
    name: p.plan,
    value: p._count._all,
  }));

  // Daily active users (past 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyEntries = await prisma.timeEntry.findMany({
    where: { date: { gte: thirtyDaysAgo } },
    select: { date: true, userId: true },
    distinct: ["date", "userId"],
  });

  const dailyMap = new Map<string, Set<string>>();
  for (const e of dailyEntries) {
    const key = e.date.toISOString().slice(0, 10);
    if (!dailyMap.has(key)) dailyMap.set(key, new Set());
    dailyMap.get(key)!.add(e.userId);
  }

  const dailyActive: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyActive.push({ date: key.slice(5), count: dailyMap.get(key)?.size ?? 0 });
  }

  return (
    <>
      <header className="app-header">
        <h1><Logo sub="Super Admin" /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className="badge badge-closed">SA</span>
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

      <main className="page-container">
        {/* KPI Cards */}
        <KpiCards
          tenantCount={tenantCount}
          totalUsers={totalUsers}
          todayActive={todayActive}
          trialExpiringSoon={trialExpiringSoon}
        />

        {/* KPI Charts */}
        <KpiCharts
          monthlyRegistrations={monthlyRegistrations}
          planDistribution={planDistribution}
          dailyActive={dailyActive}
        />

        {/* Navigation */}
        <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Link href="/super-admin/audit-logs">監査ログ</Link>
        </nav>

        {/* Tenant list */}
        <section>
          <h2 style={{ marginBottom: 12 }}>導入企業一覧</h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16 }}>
            合計 {tenants.length} 社
          </p>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>会社名</th>
                  <th>会社ID</th>
                  <th>プラン</th>
                  <th>トライアル残日数</th>
                  <th>ユーザー数</th>
                  <th>登録日</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const trialDays = t.trialEndsAt
                    ? Math.ceil((t.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  const planBadgeClass =
                    t.plan === "TRIAL"
                      ? "badge-trial"
                      : t.plan === "ACTIVE"
                        ? "badge-active"
                        : "badge-suspended";

                  return (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td style={{ fontFamily: "monospace" }}>{t.slug}</td>
                      <td>
                        <span className={`badge ${planBadgeClass}`}>{t.plan}</span>
                      </td>
                      <td>
                        {t.plan === "TRIAL" && trialDays !== null ? (
                          <span style={{ color: trialDays <= 7 ? "var(--color-danger)" : undefined }}>
                            {trialDays > 0 ? `${trialDays} 日` : "期限切れ"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{t._count.users}</td>
                      <td>
                        {new Intl.DateTimeFormat("ja-JP", {
                          timeZone: "Asia/Tokyo",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(t.createdAt)}
                      </td>
                      <td>
                        <Link href={`/super-admin/tenants/${t.id}`} className="table-action-link">詳細 →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
