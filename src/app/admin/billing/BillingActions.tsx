"use client";

import { useState } from "react";

export function BillingActions({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("ネットワークエラーが発生しました");
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
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <p style={{ color: "var(--color-danger)", marginBottom: 12, fontSize: 14 }}>
          {error}
        </p>
      )}

      {plan === "ACTIVE" && (
        <button onClick={handlePortal} disabled={loading} data-variant="primary">
          {loading ? "読み込み中..." : "支払い管理（Stripe）"}
        </button>
      )}

      {plan === "SUSPENDED" && (
        <div>
          <p style={{ color: "var(--color-danger)", marginBottom: 12 }}>
            アカウントが停止されています。再度サブスクリプションを開始してください。
          </p>
          <button onClick={handleCheckout} disabled={loading} data-variant="primary">
            {loading ? "読み込み中..." : "再サブスクライブ"}
          </button>
        </div>
      )}

      {plan !== "ACTIVE" && plan !== "SUSPENDED" && (
        <button onClick={handleCheckout} disabled={loading} data-variant="primary">
          {loading ? "読み込み中..." : "有料プランにアップグレード"}
        </button>
      )}
    </div>
  );
}
