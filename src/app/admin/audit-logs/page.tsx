import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatLocal } from "@/lib/time";

export default async function AuditLogsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>監査ログ</h1>

      <section style={{ marginTop: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>日時</th>
                <th>操作者</th>
                <th>アクション</th>
                <th>対象</th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatLocal(log.createdAt)}</td>
                  <td>{log.actor ? (log.actor.name ?? log.actor.email) : "System"}</td>
                  <td>{log.action}</td>
                  <td>{log.entityType} ({log.entityId.slice(0, 8)}…)</td>
                  <td style={{ fontSize: "0.8rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.afterJson ? JSON.stringify(log.afterJson) : "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", opacity: 0.6 }}>ログなし</td>
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
