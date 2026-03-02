import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { toSessionUser } from "@/lib/session";

import { Logo } from "../../Logo";
import { RevenueDashboard } from "./RevenueDashboard";

export default async function RevenuePage() {
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
          <Link href="/super-admin/coupons">クーポン管理</Link>
        </nav>
        <h2 style={{ marginBottom: 16 }}>収益ダッシュボード</h2>
        <RevenueDashboard />
      </main>
    </>
  );
}
