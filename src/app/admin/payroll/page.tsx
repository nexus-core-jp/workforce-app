import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { PayrollConfigForm } from "./PayrollConfigForm";

export default async function PayrollSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const { tenantId } = user;

  const [allUsers, configs] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.payrollConfig.findMany({
      where: { tenantId },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const configuredCount = configs.length;
  const unconfiguredCount = allUsers.length - configuredCount;

  const existingConfigs = configs.map((c) => ({
    id: c.id,
    userId: c.userId,
    userName: c.user.name ?? "",
    userEmail: c.user.email,
    payType: c.payType,
    baseSalary: c.baseSalary,
    hourlyRate: c.hourlyRate,
    commuteAllowance: c.commuteAllowance,
    housingAllowance: c.housingAllowance,
    familyAllowance: c.familyAllowance,
    otherAllowance: c.otherAllowance,
    otherAllowanceLabel: c.otherAllowanceLabel ?? "",
    scheduledWorkDays: c.scheduledWorkDays,
    scheduledWorkMinutes: c.scheduledWorkMinutes,
    overtimeRate: Number(c.overtimeRate),
    lateNightRate: Number(c.lateNightRate),
    holidayRate: Number(c.holidayRate),
    bankName: c.bankName ?? "",
    bankCode: c.bankCode ?? "",
    branchName: c.branchName ?? "",
    branchCode: c.branchCode ?? "",
    accountType: c.accountType ?? "普通",
    accountNumber: c.accountNumber ?? "",
    accountHolder: c.accountHolder ?? "",
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
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-compact">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <Link href="/admin">← 管理画面</Link>
          <Link href="/admin/payroll/calc">給与計算</Link>
        </nav>

        <h2 style={{ marginBottom: 8 }}>給与設定</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          社員ごとの給与形態・各種手当・振込先口座を設定します。
        </p>

        {/* Setup progress */}
        <div style={{
          display: "flex",
          gap: 24,
          marginBottom: 20,
          padding: "12px 16px",
          background: "var(--color-surface, #f8f9fa)",
          borderRadius: 8,
        }}>
          <div>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>設定済み</span>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{configuredCount} 名</div>
          </div>
          <div>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>未設定</span>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              color: unconfiguredCount > 0 ? "var(--color-warning, #c80)" : undefined,
            }}>
              {unconfiguredCount} 名
            </div>
          </div>
        </div>

        <PayrollConfigForm
          users={allUsers.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
          existingConfigs={existingConfigs}
        />
      </main>
    </>
  );
}
