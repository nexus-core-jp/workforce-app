"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("無効なリンクです。");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setMessage("メールアドレスが確認されました。ログインしてご利用ください。");
        } else {
          const data = await res.json();
          setStatus("error");
          setMessage(data.error || "検証に失敗しました。");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("通信エラーが発生しました。");
      });
  }, [token]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480, padding: 32 }}>
        {status === "loading" && <p>確認中...</p>}
        {status === "success" && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 16 }}>確認完了</h1>
            <p style={{ marginBottom: 24 }}>{message}</p>
            <a href="/login" data-variant="primary" style={{ display: "inline-block", padding: "10px 24px" }}>
              ログインページへ
            </a>
          </>
        )}
        {status === "error" && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 16 }}>エラー</h1>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: 24 }}>{message}</p>
            <a href="/register" style={{ display: "inline-block", padding: "10px 24px" }}>
              登録ページへ戻る
            </a>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>確認中...</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
