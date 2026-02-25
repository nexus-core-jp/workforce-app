"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-container">
      <div style={{ textAlign: "center", padding: 32 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>
          ダッシュボードの読み込みに失敗しました
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
        <button data-variant="primary" onClick={reset}>
          再試行
        </button>
      </div>
    </main>
  );
}
