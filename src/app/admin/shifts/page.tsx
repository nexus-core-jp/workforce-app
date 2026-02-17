import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

import { ShiftPatternForm } from "./ShiftPatternForm";
import { ShiftAssignForm } from "./ShiftAssignForm";

export default async function ShiftsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const tenantId = session.user.tenantId;

  const patterns = await prisma.shiftPattern.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });

  const assignments = await prisma.shiftAssignment.findMany({
    where: { tenantId },
    orderBy: { startDate: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      shiftPattern: { select: { name: true, plannedStart: true, plannedEnd: true } },
    },
  });

  const users = await prisma.user.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>シフト管理</h1>

      <section style={{ marginTop: 16 }}>
        <h2>シフトパターン</h2>
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>開始</th>
              <th>終了</th>
              <th>休憩(分)</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.plannedStart}</td>
                <td>{p.plannedEnd}</td>
                <td>{p.defaultBreakMinutes}</td>
              </tr>
            ))}
            {patterns.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", opacity: 0.6 }}>パターンなし</td></tr>
            )}
          </tbody>
        </table>
        <ShiftPatternForm />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>シフト割当</h2>
        <table>
          <thead>
            <tr>
              <th>ユーザー</th>
              <th>パターン</th>
              <th>時間</th>
              <th>開始日</th>
              <th>終了日</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.user.name ?? a.user.email}</td>
                <td>{a.shiftPattern.name}</td>
                <td>{a.shiftPattern.plannedStart}〜{a.shiftPattern.plannedEnd}</td>
                <td>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" }).format(a.startDate)}</td>
                <td>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" }).format(a.endDate)}</td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", opacity: 0.6 }}>割当なし</td></tr>
            )}
          </tbody>
        </table>
        <ShiftAssignForm
          patterns={patterns.map((p) => ({ id: p.id, name: p.name }))}
          users={users.map((u) => ({ id: u.id, label: u.name ?? u.email }))}
        />
      </section>

      <nav style={{ marginTop: 24 }}>
        <Link href="/dashboard">← ダッシュボード</Link>
      </nav>
    </main>
  );
}
