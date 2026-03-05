"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>
          <span className="logo">
            <span className="logo-icon" style={{ width: 32, height: 32, fontSize: 13 }}>WN</span>
            <span className="logo-text">Workforce Nexus</span>
          </span>
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
          プラットフォーム管理
        </p>

        <form
          style={{ display: "grid", gap: 16 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const res = await signIn("credentials", {
                tenant: "__platform",
                email,
                password,
                redirect: false,
              });
              if (res?.error) {
                if (res.error.includes("RATE_LIMITED")) {
                  setError("ログイン試行回数が上限を超えました。15分後にお試しください。");
                } else {
                  setError("メールアドレスまたはパスワードが正しくありません");
                }
              } else {
                router.push("/super-admin");
                router.refresh();
              }
            } catch {
              setError("ネットワークエラーが発生しました。接続を確認してください。");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>メールアドレス</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                disabled={loading}
                autoComplete="email"
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>パスワード</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </label>

            <button type="submit" data-variant="primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </div>

          {error ? <p className="error-text" role="alert">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
