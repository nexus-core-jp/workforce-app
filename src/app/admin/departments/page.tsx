import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutWithAudit } from "@/lib/logout-action";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { DepartmentManager } from "./DepartmentManager";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role !== "ADMIN") redirect("/dashboard");

  const [departments, approverCandidates] = await Promise.all([
    prisma.department.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
      include: {
        approver: { select: { id: true, name: true, email: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        active: true,
        role: "ADMIN",
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const departmentsUi = departments.map((d) => ({
    id: d.id,
    name: d.name,
    approverUserId: d.approverUserId,
    approverLabel: d.approver ? (d.approver.name ?? d.approver.email) : null,
    memberCount: d._count.users,
  }));

  const approversUi = approverCandidates.map((u) => ({
    id: u.id,
    label: u.name ?? u.email,
  }));

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
              await logoutWithAudit();
            }}
          >
            <button type="submit" className="btn-compact">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <Link href="/admin">← 管理画面</Link>
          <Link href="/dashboard">マイページ</Link>
        </nav>

        <DepartmentManager departments={departmentsUi} approvers={approversUi} />
      </main>
    </>
  );
}
