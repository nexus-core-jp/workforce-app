"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CorrectionsPanel(props: {
  isAdminOrApprover: boolean;
  pendingCount: number;
  pendingForApproval: Array<{ id: string; userLabel: string; dateLabel: string; reason: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const decide = (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    startTransition(async () => {
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
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  if (!props.isAdminOrApprover) {
    return (
      <section>
        <h2 style={{ marginBottom: 12 }}>打刻修正申請</h2>
        <p style={{ fontSize: 14 }}>
          あなたの未処理申請: <span className="badge badge-pending">{props.pendingCount} 件</span>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>打刻修正申請（承認）</h2>
      {props.pendingForApproval.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>未処理の申請はありません</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {props.pendingForApproval.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 12,
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                background: "var(--color-bg)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.dateLabel}</div>
                  <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{p.userLabel}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>理由: {p.reason}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    data-variant="success"
                    disabled={isPending}
                    onClick={() => decide(p.id, "APPROVED")}
                  >
                    承認
                  </button>
                  <button
                    data-variant="danger"
                    disabled={isPending}
                    onClick={() => decide(p.id, "REJECTED")}
                  >
                    却下
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {error ? <p className="error-text">エラー: {error}</p> : null}
    </section>
  );
}
