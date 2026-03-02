import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

import { DepartmentCreateForm } from "./DepartmentCreateForm";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const tenantId = session.user.tenantId;

  const departments = await prisma.department.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      approver: { select: { name: true, email: true } },
      _count: { select: { users: true } },
    },
  });

  const users = await prisma.user.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>部署管理</h1>

      <section style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>部署名</th>
              <th>承認者</th>
              <th>所属人数</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.approver ? (d.approver.name ?? d.approver.email) : "未設定"}</td>
                <td>{d._count.users}</td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: "center", opacity: 0.6 }}>部署なし</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <DepartmentCreateForm users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))} />

      <nav style={{ marginTop: 24 }}>
        <Link href="/dashboard">← ダッシュボード</Link>
      </nav>
    </main>
  );
}
