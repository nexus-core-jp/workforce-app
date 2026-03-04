import Link from "next/link";

export default function NotFound() {
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
        <h1 style={{ fontSize: 64, marginBottom: 8, fontWeight: 700 }}>404</h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: 16,
            marginBottom: 24,
          }}
        >
          お探しのページが見つかりませんでした。
        </p>
        <Link href="/dashboard" data-variant="primary" style={{ display: "inline-block", padding: "10px 24px" }}>
          ダッシュボードへ戻る
        </Link>
      </div>
    </main>
  );
}
