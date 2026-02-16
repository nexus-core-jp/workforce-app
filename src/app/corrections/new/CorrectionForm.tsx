"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CorrectionForm({ date }: { date: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/attendance-corrections", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date, reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        router.push("/dashboard");
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <section style={{ marginTop: 16 }}>
      <h2>申請内容</h2>
      <p>
        対象日: <b>{date}</b>
      </p>

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label>
          理由（必須）
          <textarea
            required
            rows={4}
            style={{ width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button disabled={isPending || reason.trim().length === 0} onClick={submit}>
          申請する
        </button>
        {error ? <p style={{ color: "crimson" }}>エラー: {error}</p> : null}
      </div>
    </section>
  );
}
