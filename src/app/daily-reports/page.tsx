import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatLocal } from "@/lib/time";
import { Breadcrumb } from "@/components/NavLink";
import { EmptyState } from "@/components/EmptyState";

export default async function DailyReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, tenantId, role } = session.user;
  const isAdmin = role === "ADMIN";

  const reports = await prisma.dailyReport.findMany({
    where: isAdmin ? { tenantId } : { tenantId, userId },
    orderBy: { date: "desc" },
    take: 30,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <main className="page-container">
      <Breadcrumb
        items={[
          { label: "ダッシュボード", href: "/dashboard" },
          { label: "日報" },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1>日報</h1>
        <Link href="/daily-reports/new">
          <button data-variant="primary" className="btn-compact">+ 日報を作成</button>
        </Link>
      </div>

      <section>
        <h2 style={{ marginBottom: 12 }}>{isAdmin ? "全日報一覧" : "あなたの日報"}</h2>
        {reports.length === 0 ? (
          <EmptyState
            icon="📝"
            title="日報がまだありません"
            description="日報を作成して業務内容を記録しましょう"
            actionLabel="日報を作成"
            actionHref="/daily-reports/new"
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {isAdmin && <th scope="col">報告者</th>}
                  <th scope="col">日付</th>
                  <th scope="col">ルート</th>
                  <th scope="col">件数</th>
                  <th scope="col">稼働時間</th>
                  <th scope="col">状態</th>
                  <th scope="col">提出日時</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    {isAdmin && <td>{r.user.name ?? r.user.email}</td>}
                    <td>
                      {new Intl.DateTimeFormat("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(r.date)}
                    </td>
                    <td>{r.route ?? "-"}</td>
                    <td>{r.cases ?? "-"}</td>
                    <td>{r.workHoursText ?? "-"}</td>
                    <td>
                      <span className={`badge ${r.status === "SUBMITTED" ? "badge-approved" : "badge-pending"}`}>
                        {r.status === "SUBMITTED" ? "提出済" : "下書き"}
                      </span>
                    </td>
                    <td>{r.submittedAt ? formatLocal(r.submittedAt) : "-"}</td>
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
