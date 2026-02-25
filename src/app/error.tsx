"use client";

export default function GlobalError({
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
        <button data-variant="primary" onClick={reset}>
          再試行
        </button>
      </div>
    </main>
  );
}
