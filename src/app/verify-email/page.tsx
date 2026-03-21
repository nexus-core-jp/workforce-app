"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage("無効なリンクです。");
        return;
      }

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setStatus("success");
          setMessage("メールアドレスが確認されました。ログインしてご利用ください。");
        } else {
          const data = await res.json();
          setStatus("error");
          setMessage(data.error || "検証に失敗しました。");
        }
      } catch {
        setStatus("error");
        setMessage("通信エラーが発生しました。");
      }
    }
    verify();
  }, [token]);

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
          textAlign: "center",
          maxWidth: 420,
          padding: "2.5rem 2rem",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl, 16px)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {status === "loading" && (
          <div role="status" aria-label="確認中">
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid var(--color-border)",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ color: "var(--color-text-secondary)" }}>メールアドレスを確認中...</p>
          </div>
        )}
        {status === "success" && (
          <div role="status">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--color-success-bg)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                margin: "0 auto 16px",
              }}
              aria-hidden="true"
            >
              ✓
            </div>
            <h1 style={{ fontSize: 20, marginBottom: 8, fontWeight: 700 }}>確認完了</h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: 24 }}>{message}</p>
            <a
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 24px",
                background: "var(--color-primary)",
                color: "#fff",
                borderRadius: "var(--radius)",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              ログインページへ
            </a>
          </div>
        )}
        {status === "error" && (
          <div role="alert">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--color-error-bg)",
                color: "var(--color-danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                margin: "0 auto 16px",
              }}
              aria-hidden="true"
            >
              ✕
            </div>
            <h1 style={{ fontSize: 20, marginBottom: 8, fontWeight: 700 }}>エラー</h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: 24 }}>{message}</p>
            <a
              href="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 24px",
                background: "var(--color-surface)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              登録ページへ戻る
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-bg)",
          }}
        >
          <div role="status" aria-label="読み込み中">
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid var(--color-border)",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
          </div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
