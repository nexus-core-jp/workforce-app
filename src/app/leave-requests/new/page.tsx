import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { Breadcrumb } from "@/components/NavLink";

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
      <Breadcrumb
        items={[
          { label: "ダッシュボード", href: "/dashboard" },
          { label: "休暇申請", href: "/leave-requests" },
          { label: "新規申請" },
        ]}
      />

      <h1 style={{ marginBottom: 16 }}>休暇申請（新規）</h1>

      <LeaveRequestForm balance={balance} />
    </main>
  );
}
