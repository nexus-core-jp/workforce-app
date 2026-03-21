"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

export function AdminCorrections(props: {
  items: Array<{ id: string; userLabel: string; dateLabel: string; reason: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    setSuccessId(null);
    setLoadingId(id);
    try {
      const res = await fetch("/api/attendance-corrections/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setSuccessId(id);
      setTimeout(() => router.refresh(), 500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "処理に失敗しました");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>打刻修正申請</h2>
      {props.items.length === 0 ? (
        <EmptyState
          icon="✓"
          title="未処理の申請はありません"
          description="新しい修正申請が届くとここに表示されます"
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {props.items.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 12,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: successId === p.id ? "var(--color-success-bg)" : "var(--color-bg)",
                transition: "background 0.3s ease",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{p.dateLabel}</div>
                <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                  {p.userLabel}
                </div>
                <div style={{ fontSize: 14, marginTop: 4 }}>理由: {p.reason}</div>
              </div>
              {successId === p.id ? (
                <p className="success-text" role="status">処理が完了しました</p>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    data-variant="success"
                    disabled={loadingId === p.id}
                    onClick={() => decide(p.id, "APPROVED")}
                    style={{ flex: 1 }}
                    aria-label={`${p.userLabel}の修正申請を承認`}
                  >
                    {loadingId === p.id ? "処理中..." : "承認"}
                  </button>
                  <button
                    data-variant="danger"
                    disabled={loadingId === p.id}
                    onClick={() => decide(p.id, "REJECTED")}
                    style={{ flex: 1 }}
                    aria-label={`${p.userLabel}の修正申請を却下`}
                  >
                    却下
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p className="error-text" role="alert">エラー: {error}</p>}
    </section>
  );
}
