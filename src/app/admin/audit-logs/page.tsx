import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { AuditLogFilters } from "./AuditLogFilters";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminAuditLogsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const actionFilter = params.action ?? "";
  const fromDate = params.from ?? "";
  const toDate = params.to ?? "";

  // Always scoped to own tenant
  const where: Record<string, unknown> = { tenantId: user.tenantId };
  if (actionFilter) where.action = actionFilter;
  if (fromDate || toDate) {
    const createdAt: Record<string, Date> = {};
    if (fromDate) createdAt.gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setDate(end.getDate() + 1);
      createdAt.lt = end;
    }
    where.createdAt = createdAt;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Filter options (actions for this tenant only)
  const allActions = await prisma.auditLog
    .findMany({
      where: { tenantId: user.tenantId },
      distinct: ["action"],
      select: { action: true },
    })
    .then((r) => r.map((a) => a.action));

  const fmt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className="badge badge-closed">管理者</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-compact">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <Link href="/admin">← 管理画面</Link>
        </nav>

        <h2 style={{ marginBottom: 16 }}>監査ログ</h2>

        <Suspense fallback={<div>読み込み中...</div>}>
          <AuditLogFilters actions={allActions} />
        </Suspense>

        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          {total} 件中 {total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} 件表示
        </p>

        <div className="table-scroll">
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
                  <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>{fmt.format(log.createdAt)}</td>
                  <td>{log.actor?.name ?? log.actor?.email ?? "—"}</td>
                  <td><span className="badge">{log.action}</span></td>
                  <td style={{ fontSize: 13 }}>{log.entityType}:{log.entityId.slice(0, 8)}</td>
                  <td style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.afterJson ? JSON.stringify(log.afterJson) : "—"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--color-text-secondary)" }}>
                    該当する監査ログはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
            {page > 1 && (
              <Link href={`?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}>
                ← 前へ
              </Link>
            )}
            <span style={{ fontSize: 14 }}>
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link href={`?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}>
                次へ →
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
