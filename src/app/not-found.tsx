import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", textAlign: "center", marginTop: 60 }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>404 - ページが見つかりません</h1>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>お探しのページは存在しないか、移動した可能性があります。</p>
      <Link href="/dashboard">ダッシュボードに戻る</Link>
    </main>
  );
}
