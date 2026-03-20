"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";

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
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
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
    const securePart = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `line_auth_tenant=${encodeURIComponent(tenant)}; path=/; max-age=600; SameSite=Lax${securePart}`;
    signIn("line", { callbackUrl: "/dashboard" });
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <span className="logo">
            <span className="logo-icon" style={{ width: 32, height: 32, fontSize: 13 }}>WN</span>
            <span className="logo-text">Workforce Nexus</span>
          </span>
        </h1>
        <p className={styles.subtitle}>
          勤怠管理システムにログイン
        </p>

        <form
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const res = await signIn("credentials", {
                tenant,
                email,
                password,
                totpCode: needsTotp ? totpCode : undefined,
                redirect: false,
              });
              if (res?.error) {
                if (res.error.includes("RATE_LIMITED")) {
                  setError("ログイン試行回数が上限を超えました。15分後にお試しください。");
                } else if (res.error.includes("TOTP_REQUIRED")) {
                  setNeedsTotp(true);
                  setError(null);
                } else if (res.error.includes("TOTP_INVALID")) {
                  setError("認証コードが正しくありません");
                } else {
                  setError("会社ID（会社登録時の英数字ID）、メールアドレス、またはパスワードが正しくありません");
                }
              } else {
                // Full page navigation ensures the new session cookie is picked up
                window.location.href = "/dashboard";
                return; // prevent finally from resetting loading state
              }
            } catch {
              setError("ネットワークエラーが発生しました。接続を確認してください。");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className={styles.field}>
            <label className={styles.fieldLabel}>会社ID</label>
            <input value={tenant} onChange={(e) => setTenant(e.target.value)} required disabled={loading} autoComplete="organization" placeholder="例: demo" />
            <span className={styles.fieldHint}>会社登録時に設定した英数字のIDです</span>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>メールアドレス</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              disabled={loading}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>パスワード</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              disabled={loading}
              autoComplete="current-password"
              placeholder="8文字以上"
            />
          </div>

          {needsTotp && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>認証コード（2FA）</label>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="6桁の認証コード"
                autoFocus
              />
            </div>
          )}

          <button type="submit" data-variant="primary" disabled={loading} className={styles.submitBtn}>
            {loading && <span className={styles.spinner} />}
            {loading ? "ログイン中..." : needsTotp ? "認証コードを送信" : "ログイン"}
          </button>

          {error && <p className={styles.error} role="alert">{error}</p>}
        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <hr className={styles.dividerLine} />
          <span className={styles.dividerText}>または</span>
        </div>

        {/* LINE Login Button */}
        <button
          type="button"
          onClick={handleLineLogin}
          disabled={loading}
          className={styles.lineBtn}
        >
          LINEでログイン
        </button>

        {/* Demo account info */}
        <div className={styles.demoBox}>
          <p className={styles.demoTitle}>
            デモアカウント（会社ID: demo）
          </p>
          <div className={styles.demoAccounts}>
            <div>管理者: admin@demo.local / Demo1234</div>
            <div>従業員: tanaka@demo.local / Demo1234</div>
          </div>
        </div>

        <div className={styles.links}>
          <Link href="/forgot-password">パスワードをお忘れですか？</Link>
          <Link href="/register">新規会社登録はこちら</Link>
        </div>
      </div>
    </main>
  );
}
