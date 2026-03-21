import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logoutWithAudit } from "@/lib/logout-action";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { BillingActions } from "./BillingActions";

const planLabel: Record<string, string> = {
  TRIAL: "トライアル",
  FREE: "無料 (広告あり)",
  ACTIVE: "プレミアム (広告なし)",
  SUSPENDED: "停止中",
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  if (user.role !== "ADMIN") redirect("/dashboard");

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { name: true, plan: true, trialEndsAt: true, paymentMethod: true },
  });
  if (!tenant) redirect("/dashboard");

  const now = new Date();
  const trialDays =
    tenant.plan === "TRIAL" && tenant.trialEndsAt
      ? Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

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
            <button type="submit" className="btn-compact">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <Link href="/admin">← 管理画面</Link>
        </nav>

        <section>
          <h2 style={{ marginBottom: 16 }}>プラン・請求</h2>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              現在のプラン
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {planLabel[tenant.plan] ?? tenant.plan}
            </div>
            {trialDays !== null && (
              <div
                style={{
                  fontSize: 14,
                  color: trialDays <= 7 ? "var(--color-danger)" : "var(--color-text-secondary)",
                  marginTop: 4,
                }}
              >
                トライアル残り {trialDays > 0 ? `${trialDays} 日` : "期限切れ"}
              </div>
            )}
          </div>

          <BillingActions plan={tenant.plan} paymentMethod={tenant.paymentMethod} />
        </section>

        {/* Plan comparison table (shown for FREE/TRIAL plans) */}
        {(tenant.plan === "FREE" || tenant.plan === "TRIAL") && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ marginBottom: 16 }}>プラン比較</h2>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>機能</th>
                    <th>
                      無料プラン
                      {tenant.plan === "FREE" && (
                        <span className="badge badge-free" style={{ marginLeft: 8 }}>現在</span>
                      )}
                    </th>
                    <th>
                      プレミアムプラン
                      {tenant.plan === "ACTIVE" && (
                        <span className="badge badge-closed" style={{ marginLeft: 8 }}>現在</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>勤怠管理（打刻・履歴）</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                  </tr>
                  <tr>
                    <td>日報管理</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                  </tr>
                  <tr>
                    <td>休暇管理</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                  </tr>
                  <tr>
                    <td>給与計算</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                  </tr>
                  <tr>
                    <td>CSV エクスポート</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                  </tr>
                  <tr>
                    <td>顔認証打刻</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                    <td style={{ color: "var(--color-success)" }}>利用可</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>広告表示</td>
                    <td style={{ color: "var(--color-warning)" }}>あり</td>
                    <td style={{ color: "var(--color-success)", fontWeight: 600 }}>なし</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>優先サポート</td>
                    <td style={{ color: "var(--color-muted)" }}>-</td>
                    <td style={{ color: "var(--color-success)", fontWeight: 600 }}>対応</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
