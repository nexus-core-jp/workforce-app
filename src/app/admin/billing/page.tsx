import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { BillingActions } from "./BillingActions";

const planLabel: Record<string, string> = {
  TRIAL: "トライアル",
  ACTIVE: "アクティブ",
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
    select: { name: true, plan: true, trialEndsAt: true },
  });
  if (!tenant) redirect("/dashboard");

  const trialDays =
    tenant.plan === "TRIAL" && tenant.trialEndsAt
      ? Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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
              await signOut({ redirectTo: "/login" });
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

          <BillingActions plan={tenant.plan} />
        </section>
      </main>
    </>
  );
}
