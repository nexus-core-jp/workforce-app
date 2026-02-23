"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminCorrections(props: {
  items: Array<{ id: string; userLabel: string; dateLabel: string; reason: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/attendance-corrections/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>打刻修正申請</h2>
      {props.items.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          未処理の申請はありません
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {props.items.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 12,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-bg)",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{p.dateLabel}</div>
                <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                  {p.userLabel}
                </div>
                <div style={{ fontSize: 14, marginTop: 4 }}>理由: {p.reason}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  data-variant="success"
                  disabled={loading}
                  onClick={() => decide(p.id, "APPROVED")}
                  style={{ flex: 1 }}
                >
                  承認
                </button>
                <button
                  data-variant="danger"
                  disabled={loading}
                  onClick={() => decide(p.id, "REJECTED")}
                  style={{ flex: 1 }}
                >
                  却下
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error ? <p className="error-text">エラー: {error}</p> : null}
    </section>
  );
}
