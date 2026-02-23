"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
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
          新規会社登録
        </p>

        <form
          style={{ display: "grid", gap: 16 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName, slug, adminName, email, password }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error ?? "登録に失敗しました");
              } else {
                router.push("/login");
              }
            } catch {
              setError("登録に失敗しました");
            } finally {
              setLoading(false);
            }
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span>会社名</span>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="例: 株式会社サンプル"
              autoComplete="organization"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>会社ID（ログイン時に使用）</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              pattern="^[a-z0-9_-]+$"
              placeholder="例: sample-corp"
              autoComplete="off"
            />
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              半角英数字・ハイフン・アンダースコアのみ
            </span>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>管理者名</span>
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              placeholder="例: 山田太郎"
              autoComplete="name"
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

          <label style={{ display: "grid", gap: 6 }}>
            <span>パスワード</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              8文字以上
            </span>
          </label>

          <button type="submit" data-variant="primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "登録中..." : "会社を登録"}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </form>

        <p style={{ marginTop: 20, fontSize: 14, textAlign: "center" }}>
          <Link href="/login">ログインはこちら</Link>
        </p>
      </div>
    </main>
  );
}
