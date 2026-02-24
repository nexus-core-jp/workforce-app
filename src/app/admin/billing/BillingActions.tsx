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

  if (plan === "SUSPENDED") {
    return (
      <div>
        <p style={{ color: "var(--color-danger)", marginBottom: 12 }}>
          アカウントが停止されています。再度サブスクリプションを開始してください。
        </p>
        <button onClick={handleCheckout} disabled={loading} data-variant="primary">
          {loading ? "読み込み中..." : "再サブスクライブ"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  // TRIAL
  return (
    <div>
      <button onClick={handleCheckout} disabled={loading} data-variant="primary">
        {loading ? "読み込み中..." : "有料プランにアップグレード"}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
