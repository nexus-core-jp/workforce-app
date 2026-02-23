"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../../../Logo";

type TenantPlan = "TRIAL" | "ACTIVE" | "SUSPENDED";
type UserRole = "EMPLOYEE" | "APPROVER" | "ADMIN" | "SUPER_ADMIN";

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  trialEndsAt: string | null;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

function maskName(name: string | null): string {
  if (!name) return "—";
  return name.charAt(0) + "***";
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return email.charAt(0) + "***@" + email.slice(at + 1);
}

export function TenantDetail({ tenant, users }: { tenant: TenantInfo; users: UserInfo[] }) {
  const router = useRouter();
  const [showPii, setShowPii] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  const trialDays = tenant.trialEndsAt
    ? Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const planBadgeClass =
    tenant.plan === "TRIAL"
      ? "badge-trial"
      : tenant.plan === "ACTIVE"
        ? "badge-active"
        : "badge-suspended";

  async function changePlan(newPlan: TenantPlan) {
    if (newPlan === tenant.plan) return;
    setChangingPlan(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "プラン変更に失敗しました");
      }
    } catch {
      alert("プラン変更に失敗しました");
    } finally {
      setChangingPlan(false);
    }
  }

  function handleTogglePii() {
    if (!showPii) {
      if (!window.confirm("個人情報を表示しますか？閲覧記録が残ります。")) return;
    }
    setShowPii(!showPii);
  }

  return (
    <>
      <header className="app-header">
        <h1><Logo sub="Super Admin" /></h1>
        <div className="user-info">
          <span className="badge badge-closed">SA</span>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ marginBottom: 8 }}>
          <Link href="/super-admin">← テナント一覧</Link>
        </nav>

        <section>
          <h2 style={{ marginBottom: 16 }}>テナント情報</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>会社名</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{tenant.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>会社ID</div>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "monospace" }}>{tenant.slug}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>プラン</div>
              <div><span className={`badge ${planBadgeClass}`}>{tenant.plan}</span></div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>トライアル残日数</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {tenant.plan === "TRIAL" && trialDays !== null
                  ? trialDays > 0
                    ? `${trialDays} 日`
                    : "期限切れ"
                  : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>登録日</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {new Intl.DateTimeFormat("ja-JP", {
                  timeZone: "Asia/Tokyo",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(tenant.createdAt))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>ユーザー数</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{users.length} 名</div>
            </div>
          </div>
        </section>

        {/* Plan change */}
        <section>
          <h2 style={{ marginBottom: 12 }}>プラン変更</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["TRIAL", "ACTIVE", "SUSPENDED"] as TenantPlan[]).map((p) => (
              <button
                key={p}
                data-variant={p === tenant.plan ? "primary" : undefined}
                disabled={changingPlan || p === tenant.plan}
                onClick={() => changePlan(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        {/* User list */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2>ユーザー一覧</h2>
            <button onClick={handleTogglePii} className="btn-compact">
              {showPii ? "個人情報を非表示" : "個人情報を表示"}
            </button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>名前</th>
                  <th>メール</th>
                  <th>役割</th>
                  <th>状態</th>
                  <th>登録日</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{showPii ? (u.name ?? "—") : maskName(u.name)}</td>
                    <td style={{ fontFamily: "monospace" }}>
                      {showPii ? u.email : maskEmail(u.email)}
                    </td>
                    <td>
                      <span className={`badge ${u.role === "ADMIN" ? "badge-closed" : u.role === "APPROVER" ? "badge-pending" : "badge-open"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.active ? "badge-approved" : "badge-rejected"}`}>
                        {u.active ? "有効" : "無効"}
                      </span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(u.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
