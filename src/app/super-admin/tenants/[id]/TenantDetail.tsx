"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../../../Logo";

type TenantPlan = "TRIAL" | "ACTIVE" | "SUSPENDED";
type UserRole = string;

type PaymentMethodType = "STRIPE" | "PAYJP" | "BANK_TRANSFER" | "NONE";

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  paymentMethod?: PaymentMethodType;
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
  const [piiConfirm, setPiiConfirm] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!window.confirm(`${tenant.name} のプランを「${newPlan}」に変更しますか？`)) return;
    setChangingPlan(true);
    setError(null);
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
        setError(data.error ?? "プラン変更に失敗しました");
      }
    } catch {
      setError("プラン変更に失敗しました");
    } finally {
      setChangingPlan(false);
    }
  }

  async function handleTogglePii() {
    if (!showPii) {
      setPiiConfirm(true);
      return;
    }
    setShowPii(false);
  }

  async function confirmPii() {
    // Log PII viewing to audit log
    try {
      await fetch(`/api/super-admin/tenants/${tenant.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VIEW_PII" }),
      });
    } catch {
      // Non-blocking: proceed even if logging fails
    }
    setPiiConfirm(false);
    setShowPii(true);
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
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>決済方法</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {tenant.paymentMethod === "STRIPE" ? "Stripe" : tenant.paymentMethod === "PAYJP" ? "PAY.JP" : tenant.paymentMethod === "BANK_TRANSFER" ? "銀行振込" : "未設定"}
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
          {error && <p className="error-text">{error}</p>}
        </section>

        {/* User list */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2>ユーザー一覧</h2>
            <button onClick={handleTogglePii} className="btn-compact">
              {showPii ? "個人情報を非表示" : "個人情報を表示"}
            </button>
          </div>

          {piiConfirm && (
            <div style={{
              padding: 16,
              marginBottom: 12,
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
            }}>
              <p style={{ fontSize: 14, marginBottom: 12 }}>個人情報を表示しますか？閲覧記録が残ります。</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button data-variant="primary" className="btn-compact" onClick={confirmPii}>表示する</button>
                <button className="btn-compact" onClick={() => setPiiConfirm(false)}>キャンセル</button>
              </div>
            </div>
          )}

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
                      <span className={`badge ${u.role === "ADMIN" ? "badge-closed" : "badge-open"}`}>
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
