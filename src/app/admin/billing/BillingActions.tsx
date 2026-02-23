"use client";

import { useState } from "react";

export function BillingActions({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (plan === "ACTIVE") {
    return (
      <button onClick={handlePortal} disabled={loading} data-variant="primary">
        {loading ? "読み込み中..." : "支払い管理（Stripe）"}
      </button>
    );
  }

  if (plan === "SUSPENDED") {
    return (
      <div>
        <p style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          アカウントが停止されています。再度サブスクリプションを開始してください。
        </p>
        <button onClick={handleCheckout} disabled={loading} data-variant="primary">
          {loading ? "読み込み中..." : "再サブスクライブ"}
        </button>
      </div>
    );
  }

  // TRIAL
  return (
    <button onClick={handleCheckout} disabled={loading} data-variant="primary">
      {loading ? "読み込み中..." : "有料プランにアップグレード"}
    </button>
  );
}
