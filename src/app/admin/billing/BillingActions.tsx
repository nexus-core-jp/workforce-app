"use client";

import { useState } from "react";

export function BillingActions({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoCode ? { promoCode } : {}),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "チェックアウトの作成に失敗しました");
      }
    } catch {
      setError("ネットワークエラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "支払い管理画面の取得に失敗しました");
      }
    } catch {
      setError("ネットワークエラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (plan === "ACTIVE") {
    return (
      <div>
        <button onClick={handlePortal} disabled={loading} data-variant="primary">
          {loading ? "読み込み中..." : "支払い管理（Stripe）"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  // TRIAL or SUSPENDED
  return (
    <div>
      {plan === "SUSPENDED" && (
        <p style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          アカウントが停止されています。再度サブスクリプションを開始してください。
        </p>
      )}

      {/* Promo code input */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
          プロモーションコード（お持ちの場合）
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="例: WELCOME2026"
            style={{ padding: "6px 8px", width: 200, fontFamily: "monospace" }}
          />
          {promoCode && (
            <span style={{ fontSize: 12, color: "var(--color-success)" }}>適用されます</span>
          )}
        </div>
      </div>

      <button onClick={handleCheckout} disabled={loading} data-variant="primary">
        {loading ? "読み込み中..." : plan === "SUSPENDED" ? "再サブスクライブ" : "有料プランにアップグレード"}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
