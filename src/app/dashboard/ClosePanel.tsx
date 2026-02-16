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
    <section style={{ marginTop: 16 }}>
      <h2 style={{ marginBottom: 8 }}>締め（管理者）</h2>
      <p style={{ margin: 0 }}>
        対象月: <b>{props.month}</b> / 状態: <b>{props.isClosed ? "締め済み" : "未締め"}</b>
      </p>
      <div style={{ marginTop: 8 }}>
        <button disabled={props.isClosed || isPending} onClick={close}>
          今月を締める
        </button>
      </div>
      {error ? <p style={{ color: "crimson" }}>エラー: {error}</p> : null}
    </section>
  );
}
