"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", padding: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>
          エラーが発生しました
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          {error.message || "問題が発生しました。再度お試しください。"}
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
