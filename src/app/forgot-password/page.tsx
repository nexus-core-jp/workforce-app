"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [tenant, setTenant] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "2.5rem 2rem",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl, 16px)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>
          <span className="logo">
            <span className="logo-icon" style={{ width: 32, height: 32, fontSize: 13 }}>WN</span>
            <span className="logo-text">Workforce Nexus</span>
          </span>
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
          パスワードをお忘れですか？
        </p>

        {sent ? (
          <div role="status">
            <div
              style={{
                padding: "16px",
                background: "var(--color-success-bg)",
                borderRadius: "var(--radius)",
                borderLeft: "3px solid var(--color-success)",
                marginBottom: 16,
              }}
            >
              <p style={{ fontWeight: 500, marginBottom: 4 }}>メールを送信しました</p>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                入力されたメールアドレス宛にパスワードリセットのリンクを送信しました。メールをご確認ください。
              </p>
            </div>
            <p style={{ fontSize: 14, textAlign: "center" }}>
              <Link href="/login">ログインに戻る</Link>
            </p>
          </div>
        ) : (
          <form
            style={{ display: "grid", gap: 18 }}
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                const res = await fetch("/api/auth/forgot-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tenant, email }),
                });
                if (!res.ok) {
                  setError("リクエストに失敗しました");
                } else {
                  setSent(true);
                }
              } catch {
                setError("通信エラーが発生しました");
              } finally {
                setLoading(false);
              }
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor="fp-tenant" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>会社ID</label>
              <input
                id="fp-tenant"
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                required
                disabled={loading}
                autoComplete="organization"
                placeholder="例: demo"
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor="fp-email" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>メールアドレス</label>
              <input
                id="fp-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                disabled={loading}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <button type="submit" data-variant="primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? "送信中..." : "リセットリンクを送信"}
            </button>

            {error && <p className="error-text" role="alert">{error}</p>}

            <p style={{ fontSize: 14, textAlign: "center" }}>
              <Link href="/login">ログインに戻る</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
