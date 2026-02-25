import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { ShiftPatternManager } from "./ShiftPatternManager";
import { ShiftAssignmentManager } from "./ShiftAssignmentManager";

export default async function ShiftsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, role } = user;
  if (role !== "ADMIN") redirect("/dashboard");

  const [patterns, members, assignments] = await Promise.all([
    prisma.shiftPattern.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { tenantId, active: true, role: { not: "SUPER_ADMIN" } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.shiftAssignment.findMany({
      where: { tenantId },
      include: {
        user: { select: { name: true, email: true } },
        shiftPattern: { select: { name: true } },
      },
      orderBy: { startDate: "desc" },
      take: 50,
    }),
  ]);

  const patternsUi = patterns.map((p) => ({
    id: p.id,
    name: p.name,
    plannedStart: p.plannedStart,
    plannedEnd: p.plannedEnd,
    defaultBreakMinutes: p.defaultBreakMinutes,
  }));

  const membersUi = members.map((m) => ({
    id: m.id,
    name: m.name ?? m.email,
  }));

  const assignmentsUi = assignments.map((a) => ({
    id: a.id,
    userId: a.userId,
    userName: a.user.name ?? a.user.email,
    shiftName: a.shiftPattern.name,
    startDate: a.startDate.toISOString().slice(0, 10),
    endDate: a.endDate.toISOString().slice(0, 10),
  }));

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className="badge badge-closed">管理者</span>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <Link href="/admin">← 管理画面</Link>
          <Link href="/admin/members">メンバー管理</Link>
        </nav>

        <h1 style={{ marginBottom: 16 }}>シフト管理</h1>

        <ShiftPatternManager patterns={patternsUi} />
        <ShiftAssignmentManager patterns={patternsUi} members={membersUi} assignments={assignmentsUi} />
      </main>
    </>
  );
}
