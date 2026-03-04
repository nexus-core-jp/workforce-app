import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

import { UserCreateForm } from "./UserCreateForm";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>ユーザー管理</h1>

      <section style={{ marginTop: 16 }}>
        <h2>ユーザー一覧</h2>
        <div style={{ overflowX: "auto" }}>
          <table cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>名前</th>
                <th>メール</th>
                <th>ロール</th>
                <th>状態</th>
                <th>作成日</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td>{u.name ?? "-"}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.active ? "有効" : "無効"}</td>
                  <td>{u.createdAt.toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <UserCreateForm />

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard">← ダッシュボード</Link>
      </div>
    </main>
  );
}
