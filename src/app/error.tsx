"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>
          エラーが発生しました
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          {error.message || "予期しないエラーが発生しました。"}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={reset} data-variant="primary">
            再試行
          </button>
          <Link href="/dashboard">
            <button>ダッシュボードへ</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
