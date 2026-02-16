"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", textAlign: "center", marginTop: 60 }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>エラーが発生しました</h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>
        {error.message || "予期しないエラーです。"}
      </p>
      <button onClick={reset}>再試行</button>
    </main>
  );
}
