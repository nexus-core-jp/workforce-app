import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { LeaveRequestForm } from "./LeaveRequestForm";

export default async function NewLeaveRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, id: userId } = user;

  // Calculate leave balance
  const ledger = await prisma.leaveLedgerEntry.findMany({
    where: { tenantId, userId },
  });
  let balance = 0;
  for (const entry of ledger) {
    const days = Number(entry.days);
    if (entry.kind === "USE") {
      balance -= days;
    } else {
      balance += days;
    }
  }

  return (
    <main className="page-container">
      <h1 style={{ marginBottom: 16 }}>休暇申請（新規）</h1>

      <LeaveRequestForm balance={balance} />

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <Link href="/leave-requests">&larr; 申請一覧</Link>
        <Link href="/dashboard">ダッシュボード</Link>
      </div>
    </main>
  );
}
