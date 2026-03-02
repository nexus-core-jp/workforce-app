"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: "弱い", color: "var(--color-danger)" };
  if (score <= 4) return { score, label: "普通", color: "var(--color-warning)" };
  return { score, label: "強い", color: "var(--color-success)" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasLength = password.length >= 8;

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
        <h1 style={{ fontSize: 24, marginBottom: 4 }}><span className="logo"><span className="logo-icon" style={{ width: 32, height: 32, fontSize: 13 }}>WN</span><span className="logo-text">Workforce Nexus</span></span></h1>
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
              setError("ネットワークエラーが発生しました。接続を確認してください。");
            } finally {
              setLoading(false);
            }
          }}
        >
          <fieldset disabled={loading} style={{ display: "contents", border: "none", padding: 0, margin: 0 }}>
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
              {/* Password strength meter */}
              {password.length > 0 && (
                <div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: i <= strength.score ? strength.color : "var(--color-border)",
                          transition: "background 0.2s",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: strength.color, fontWeight: 600 }}>
                    {strength.label}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 12, display: "grid", gap: 2 }}>
                <span style={{ color: hasLength ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                  {hasLength ? "\u2713" : "\u2022"} 8文字以上
                </span>
                <span style={{ color: hasLower ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                  {hasLower ? "\u2713" : "\u2022"} 小文字を含む
                </span>
                <span style={{ color: hasUpper ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                  {hasUpper ? "\u2713" : "\u2022"} 大文字を含む
                </span>
                <span style={{ color: hasDigit ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                  {hasDigit ? "\u2713" : "\u2022"} 数字を含む
                </span>
              </div>
            </label>

            <button type="submit" data-variant="primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "登録中..." : "会社を登録"}
            </button>
          </fieldset>

          {error ? <p className="error-text" role="alert">{error}</p> : null}
        </form>

        <p style={{ marginTop: 20, fontSize: 14, textAlign: "center" }}>
          <Link href="/login">ログインはこちら</Link>
        </p>
      </div>
    </main>
  );
}
