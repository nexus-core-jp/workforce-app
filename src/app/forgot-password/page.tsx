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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 32,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Workforce</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
          パスワードをお忘れですか？
        </p>

        {sent ? (
          <div>
            <p style={{ marginBottom: 16 }}>
              入力されたメールアドレス宛にパスワードリセットのリンクを送信しました。メールをご確認ください。
            </p>
            <p style={{ fontSize: 14 }}>
              <Link href="/login">ログインに戻る</Link>
            </p>
          </div>
        ) : (
          <form
            style={{ display: "grid", gap: 16 }}
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
            <label style={{ display: "grid", gap: 6 }}>
              <span>会社ID</span>
              <input
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
                required
                autoComplete="organization"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>メールアドレス</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="email"
              />
            </label>

            <button type="submit" data-variant="primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "送信中..." : "リセットリンクを送信"}
            </button>

            {error ? <p className="error-text">{error}</p> : null}

            <p style={{ fontSize: 14, textAlign: "center" }}>
              <Link href="/login">ログインに戻る</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
