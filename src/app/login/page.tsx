"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [tenant, setTenant] = useState("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Workforce</h1>
      <p style={{ marginTop: 8, color: "#666" }}>ログイン</p>

      <form
        style={{ display: "grid", gap: 12, marginTop: 16 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            const res = await signIn("credentials", {
              tenant,
              email,
              password,
              redirect: true,
              callbackUrl: "/",
            });
            if (res?.error) setError("ログインに失敗しました");
          } catch {
            setError("ログインに失敗しました");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span>会社ID（tenant）</span>
          <input value={tenant} onChange={(e) => setTenant(e.target.value)} required />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>メール</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>パスワード</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "処理中…" : "ログイン"}
        </button>

        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      </form>
    </main>
  );
}
