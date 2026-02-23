"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState("demo");
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Workforce</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
          勤怠管理システムにログイン
        </p>

        <form
          style={{ display: "grid", gap: 16 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const res = await signIn("credentials", {
                tenant,
                email,
                password,
                redirect: false,
              });
              if (res?.error) {
                setError("会社ID、メールアドレス、またはパスワードが正しくありません");
              } else {
                router.push("/dashboard");
                router.refresh();
              }
            } catch {
              setError("ログインに失敗しました");
            } finally {
              setLoading(false);
            }
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span>会社ID</span>
            <input value={tenant} onChange={(e) => setTenant(e.target.value)} required />
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

          <label style={{ display: "grid", gap: 6 }}>
            <span>パスワード</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" data-variant="primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "ログイン中..." : "ログイン"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
