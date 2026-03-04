"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ShiftPatternForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [breakMin, setBreakMin] = useState("60");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setOpen(true)}>+ パターン追加</button>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            plannedStart: start,
            plannedEnd: end,
            defaultBreakMinutes: parseInt(breakMin, 10) || 60,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setName("");
        setOpen(false);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 400, gridTemplateColumns: "1fr 1fr" }}>
        <label style={{ display: "grid", gap: 4, gridColumn: "span 2" }}>
          名前
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 日勤A" />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          開始時刻
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          終了時刻
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          休憩(分)
          <input type="number" min={0} value={breakMin} onChange={(e) => setBreakMin(e.target.value)} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button disabled={isPending || !name} onClick={submit}>{isPending ? "作成中…" : "作成"}</button>
        <button onClick={() => setOpen(false)}>キャンセル</button>
      </div>
      {error ? <p style={{ color: "var(--danger)", marginTop: 4 }}>エラー: {error}</p> : null}
    </div>
  );
}
