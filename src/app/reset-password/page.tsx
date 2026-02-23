"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div>
        <p style={{ marginBottom: 16 }}>無効なリンクです。</p>
        <Link href="/forgot-password">パスワードリセットをやり直す</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <p style={{ marginBottom: 16 }}>パスワードを変更しました。</p>
        <Link href="/login">ログインする</Link>
      </div>
    );
  }

  return (
    <form
      style={{ display: "grid", gap: 16 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);

        if (password !== confirm) {
          setError("パスワードが一致しません");
          return;
        }

        setLoading(true);
        try {
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "リセットに失敗しました");
          } else {
            setDone(true);
          }
        } catch {
          setError("通信エラーが発生しました");
        } finally {
          setLoading(false);
        }
      }}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span>新しいパスワード</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>パスワード確認</span>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>

      <button type="submit" data-variant="primary" disabled={loading} style={{ marginTop: 8 }}>
        {loading ? "変更中..." : "パスワードを変更"}
      </button>

      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}

export default function ResetPasswordPage() {
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
        <h1 style={{ fontSize: 24, marginBottom: 4 }}><span className="logo"><span className="logo-icon" style={{ width: 32, height: 32, fontSize: 16 }}>W</span><span className="logo-text">Workforce</span></span></h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
          パスワード再設定
        </p>
        <Suspense fallback={<div>読み込み中...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
