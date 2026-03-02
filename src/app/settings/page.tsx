import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>設定</h1>

      <section style={{ marginTop: 16 }}>
        <h2>アカウント情報</h2>
        <ul style={{ paddingLeft: 18 }}>
          <li>名前: {session.user.name ?? "-"}</li>
          <li>メール: {session.user.email}</li>
          <li>ロール: {session.user.role}</li>
        </ul>
      </section>

      <ChangePasswordForm />

      <div style={{ marginTop: 24 }}>
        <Link href="/dashboard">← ダッシュボード</Link>
      </div>
    </main>
  );
}
