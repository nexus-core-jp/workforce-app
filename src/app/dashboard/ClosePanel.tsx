"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ClosePanel(props: { isAdmin: boolean; month: string; isClosed: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!props.isAdmin) return null;

  const close = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/close", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ month: props.month }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>月次締め（管理者）</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>対象月: </span>
          <span style={{ fontWeight: 600 }}>{props.month}</span>
        </div>
        <span className={`badge ${props.isClosed ? "badge-closed" : "badge-open"}`}>
          {props.isClosed ? "締め済み" : "未締め"}
        </span>
        {!props.isClosed && (
          <button data-variant="primary" disabled={isPending} onClick={close}>
            今月を締める
          </button>
        )}
      </div>
      {error ? <p className="error-text">エラー: {error}</p> : null}
    </section>
  );
}
