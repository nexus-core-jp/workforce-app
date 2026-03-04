import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutWithAudit } from "@/lib/logout-action";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { AddMemberForm } from "./AddMemberForm";
import { MemberList } from "./MemberList";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role !== "ADMIN") redirect("/dashboard");

  const [members, departments] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const membersUi = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role as "EMPLOYEE" | "ADMIN",
    active: m.active,
    createdAt: m.createdAt.toISOString(),
    departmentId: m.departmentId,
    departmentName: m.department?.name ?? null,
  }));

  const departmentsUi = departments.map((d) => ({ id: d.id, name: d.name }));

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

        <AddMemberForm departments={departmentsUi} />
        <MemberList members={membersUi} currentUserId={user.id} departments={departmentsUi} />
      </main>
    </>
  );
}
