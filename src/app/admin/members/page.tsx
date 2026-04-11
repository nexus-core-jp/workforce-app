import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutWithAudit } from "@/lib/logout-action";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { AddMemberForm } from "./AddMemberForm";
import { MemberList } from "./MemberList";

const PAGE_SIZE = 50;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [members, totalCount, departments] = await Promise.all([
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
        hireDate: true,
        retiredAt: true,
        employmentType: true,
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where: { tenantId: user.tenantId } }),
    prisma.department.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fmtDate = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d)
      : null;

  const membersUi = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role as "EMPLOYEE" | "ADMIN",
    active: m.active,
    createdAt: m.createdAt.toISOString(),
    departmentId: m.departmentId,
    departmentName: m.department?.name ?? null,
    hireDateLabel: fmtDate(m.hireDate),
    retiredAtLabel: fmtDate(m.retiredAt),
    employmentType: m.employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "OUTSOURCED",
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

        {totalPages > 1 && (
          <nav style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
            {page > 1 && (
              <Link href={`/admin/members?page=${page - 1}`}>← 前へ</Link>
            )}
            <span>{page} / {totalPages}</span>
            {page < totalPages && (
              <Link href={`/admin/members?page=${page + 1}`}>次へ →</Link>
            )}
          </nav>
        )}
      </main>
    </>
  );
}
