import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { CouponManager } from "./CouponManager";

export default async function CouponsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <>
      <header className="app-header">
        <h1><Logo sub="Super Admin" /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className="badge badge-closed">SA</span>
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
          <Link href="/super-admin">← ダッシュボード</Link>
          <Link href="/super-admin/revenue">収益ダッシュボード</Link>
        </nav>
        <h2 style={{ marginBottom: 8 }}>クーポン・プロモーションコード管理</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          Stripeのクーポンとプロモーションコードを管理します。発行したコードはテナント管理者が有料プランへのアップグレード時に使用できます。
        </p>
        <CouponManager />
      </main>
    </>
  );
}
