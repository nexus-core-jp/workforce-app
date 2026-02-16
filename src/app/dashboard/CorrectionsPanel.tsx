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
      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 8 }}>打刻修正申請</h2>
        <p style={{ margin: 0 }}>あなたの未処理申請: {props.pendingCount} 件</p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h2 style={{ marginBottom: 8 }}>打刻修正申請（承認）</h2>
      {props.pendingForApproval.length === 0 ? (
        <p style={{ margin: 0 }}>未処理なし</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {props.pendingForApproval.map((p) => (
            <li key={p.id} style={{ marginBottom: 8 }}>
              <div>
                <b>{p.dateLabel}</b> / {p.userLabel}
              </div>
              <div style={{ opacity: 0.8 }}>理由: {p.reason}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button disabled={isPending} onClick={() => decide(p.id, "APPROVED")}>
                  承認
                </button>
                <button disabled={isPending} onClick={() => decide(p.id, "REJECTED")}>
                  却下
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? <p style={{ color: "crimson" }}>エラー: {error}</p> : null}
    </section>
  );
}
