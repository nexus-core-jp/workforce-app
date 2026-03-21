import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/NavLink";

import { ChangePasswordForm } from "./ChangePasswordForm";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "管理者",
  EMPLOYEE: "従業員",
  SUPER_ADMIN: "スーパー管理者",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="page-container">
      <Breadcrumb
        items={[
          { label: "ダッシュボード", href: "/dashboard" },
          { label: "設定" },
        ]}
      />

      <h1 style={{ marginBottom: 16 }}>設定</h1>

      <section aria-label="アカウント情報">
        <h2 style={{ marginBottom: 12 }}>アカウント情報</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="stat-card">
            <div className="stat-label">名前</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{session.user.name ?? "-"}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">メールアドレス</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{session.user.email}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">ロール</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              <span className="badge badge-closed">
                {ROLE_LABELS[session.user.role] ?? session.user.role}
              </span>
            </div>
          </div>
        </div>
      </section>

      <ChangePasswordForm />
    </main>
  );
}
