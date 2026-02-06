import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        tenant: <b>{user.tenantId}</b> / role: <b>{user.role}</b>
      </p>

      <div style={{ marginTop: 16 }}>
        <p>
          ログイン中: <b>{user.name ?? user.email}</b>
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Link href="/">/ (root)</Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit">ログアウト</button>
        </form>
      </div>

      <hr style={{ margin: "24px 0" }} />
      <p>次: 打刻UI（出勤/休憩/退勤）をここに足す。</p>
    </main>
  );
}
