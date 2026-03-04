import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { startOfJstDay } from "@/lib/time";

import { Logo } from "../../../Logo";
import { PayrollCalcPanel } from "./PayrollCalcPanel";

export default async function PayrollCalcPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const { tenantId } = user;

  const today = startOfJstDay(new Date());
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(today);

  // Check how many configs are set up
  const [configCount, userCount] = await Promise.all([
    prisma.payrollConfig.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, active: true } }),
  ]);

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
          <Link href="/admin/payroll">給与設定</Link>
        </nav>

        <h2 style={{ marginBottom: 8 }}>給与計算</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          月次の給与計算・確定・CSV出力を行います。
        </p>

        {configCount === 0 ? (
          <div style={{
            padding: "16px 20px",
            background: "#fff3e0",
            border: "1px solid #ffb74d",
            borderRadius: 8,
          }}>
            <p style={{ margin: 0, fontWeight: 600 }}>給与設定が未登録です</p>
            <p style={{ margin: "8px 0 0", fontSize: 13 }}>
              給与計算を実行するには、先に
              <Link href="/admin/payroll" style={{ fontWeight: 600 }}>給与設定</Link>
              から社員の給与情報を登録してください。
            </p>
          </div>
        ) : (
          <>
            {configCount < userCount && (
              <div style={{
                padding: "12px 16px",
                background: "#fffde7",
                border: "1px solid #fdd835",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 13,
              }}>
                {userCount - configCount} 名の社員の給与設定が未登録です。
                <Link href="/admin/payroll" style={{ marginLeft: 8 }}>設定する</Link>
              </div>
            )}
            <PayrollCalcPanel defaultMonth={month} />
          </>
        )}
      </main>
    </>
  );
}
