import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

import { GrantForm } from "./GrantForm";

export default async function LeaveBalancePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, tenantId, role } = session.user;
  const isAdmin = role === "ADMIN";

  const entries = await prisma.leaveLedgerEntry.findMany({
    where: { tenantId, userId },
    orderBy: { effectiveDate: "desc" },
    include: { request: { select: { type: true } } },
  });

  const balance = entries.reduce((sum, e) => {
    if (e.kind === "GRANT" || e.kind === "ADJUST") return sum + Number(e.days);
    return sum - Number(e.days);
  }, 0);

  // Admin: see all users balances
  let allBalances: Array<{ userId: string; userName: string; balance: number }> = [];
  if (isAdmin) {
    const users = await prisma.user.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, email: true },
    });
    const allEntries = await prisma.leaveLedgerEntry.findMany({
      where: { tenantId },
    });
    const balanceMap = new Map<string, number>();
    for (const e of allEntries) {
      const cur = balanceMap.get(e.userId) ?? 0;
      if (e.kind === "GRANT" || e.kind === "ADJUST") {
        balanceMap.set(e.userId, cur + Number(e.days));
      } else {
        balanceMap.set(e.userId, cur - Number(e.days));
      }
    }
    allBalances = users.map((u) => ({
      userId: u.id,
      userName: u.name ?? u.email,
      balance: balanceMap.get(u.id) ?? 0,
    }));
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>休暇残高</h1>

      <section style={{ marginTop: 16 }}>
        <h2>あなたの残高</h2>
        <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{balance} 日</p>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>日付</th>
              <th>種別</th>
              <th>日数</th>
              <th>メモ</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo" }).format(e.effectiveDate)}</td>
                <td>{e.kind}</td>
                <td>{e.kind === "USE" ? `-${e.days}` : `+${e.days}`}</td>
                <td>{e.note ?? (e.request ? e.request.type : "-")}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", opacity: 0.6 }}>記録なし</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {isAdmin && (
        <section style={{ marginTop: 24 }}>
          <h2>全ユーザーの残高</h2>
          <table>
            <thead>
              <tr>
                <th>ユーザー</th>
                <th>残高（日）</th>
              </tr>
            </thead>
            <tbody>
              {allBalances.map((b) => (
                <tr key={b.userId}>
                  <td>{b.userName}</td>
                  <td>{b.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <GrantForm users={allBalances.map((b) => ({ id: b.userId, label: b.userName }))} />
        </section>
      )}

      <nav style={{ marginTop: 24 }}>
        <Link href="/leave">← 休暇申請</Link>
        <Link href="/dashboard">← ダッシュボード</Link>
      </nav>
    </main>
  );
}
