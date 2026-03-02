"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const LINE_ERROR_MESSAGES: Record<string, string> = {
  LINE_NOT_LINKED: "このLINEアカウントは会社IDに紐づいていません。先にアカウント連携を行ってください。",
  NO_TENANT: "会社IDを入力してからLINEログインを押してください。",
  TENANT_NOT_FOUND: "指定された会社IDが見つかりません。",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenant, setTenant] = useState("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Show errors from LINE OAuth redirects
  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam && LINE_ERROR_MESSAGES[errParam]) {
      setError(LINE_ERROR_MESSAGES[errParam]);
    }
  }, [searchParams]);

  const handleLineLogin = () => {
    if (!tenant.trim()) {
      setError("会社IDを入力してからLINEログインを押してください");
      return;
    }
    setError(null);
    setLoading(true);
    // Store tenant in cookie so the auth callback can identify which tenant to check
    document.cookie = `line_auth_tenant=${encodeURIComponent(tenant)}; path=/; max-age=600; SameSite=Lax`;
    signIn("line", { callbackUrl: "/dashboard" });
  };

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
                if (res.error.includes("RATE_LIMITED")) {
                  setError("ログイン試行回数が上限を超えました。15分後にお試しください。");
                } else {
                  setError("会社ID、メールアドレス、またはパスワードが正しくありません");
                }
              } else {
                router.push("/dashboard");
                router.refresh();
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
              <span>会社ID</span>
              <input value={tenant} onChange={(e) => setTenant(e.target.value)} required autoComplete="organization" />
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
          </fieldset>

          {error ? <p className="error-text" role="alert">{error}</p> : null}
        </form>

        {/* Divider */}
        <div style={{ position: "relative", textAlign: "center", margin: "20px 0 16px" }}>
          <hr style={{ border: "none", borderTop: "1px solid var(--color-border)" }} />
          <span style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--color-surface)", padding: "0 12px",
            color: "var(--color-text-secondary)", fontSize: 12,
          }}>
            または
          </span>
        </div>

        {/* LINE Login Button */}
        <button
          type="button"
          onClick={handleLineLogin}
          disabled={loading}
          style={{
            width: "100%",
            background: "#06C755",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          LINEでログイン
        </button>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: "center" }}>
          <Link href="/forgot-password">パスワードをお忘れですか？</Link>
        </p>
        <p style={{ marginTop: 8, fontSize: 14, textAlign: "center" }}>
          <Link href="/register">新規会社登録はこちら</Link>
        </p>
      </div>
    </main>
  );
}
