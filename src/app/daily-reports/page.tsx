import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatLocal } from "@/lib/time";

export default async function DailyReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, tenantId, role } = session.user;
  const isAdmin = role === "ADMIN" || role === "APPROVER";

  const reports = await prisma.dailyReport.findMany({
    where: isAdmin ? { tenantId } : { tenantId, userId },
    orderBy: { date: "desc" },
    take: 30,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>日報</h1>

      <div style={{ marginTop: 16 }}>
        <Link href="/daily-reports/new">+ 日報を作成</Link>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>{isAdmin ? "全日報一覧" : "あなたの日報"}</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                {isAdmin && <th>報告者</th>}
                <th>日付</th>
                <th>ルート</th>
                <th>件数</th>
                <th>稼働時間</th>
                <th>状態</th>
                <th>提出日時</th>
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
                  <td>{r.status === "SUBMITTED" ? "提出済" : "下書き"}</td>
                  <td>{r.submittedAt ? formatLocal(r.submittedAt) : "-"}</td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: "center", opacity: 0.6 }}>
                    日報なし
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav style={{ marginTop: 24 }}>
        <Link href="/dashboard">← ダッシュボード</Link>
      </nav>
    </main>
  );
}
