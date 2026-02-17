"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ShiftAssignForm({
  patterns,
  users,
}: {
  patterns: Array<{ id: string; name: string }>;
  users: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [patternId, setPatternId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setOpen(true)} disabled={patterns.length === 0 || users.length === 0}>
          + シフト割当
        </button>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/shifts/assignments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId, shiftPatternId: patternId, startDate, endDate }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setOpen(false);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 400 }}>
        <label style={{ display: "grid", gap: 4 }}>
          ユーザー
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">選択...</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          シフトパターン
          <select value={patternId} onChange={(e) => setPatternId(e.target.value)}>
            <option value="">選択...</option>
            {patterns.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          開始日
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          終了日
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button disabled={isPending || !userId || !patternId || !startDate || !endDate} onClick={submit}>
          {isPending ? "割当中…" : "割当する"}
        </button>
        <button onClick={() => setOpen(false)}>キャンセル</button>
      </div>
      {error ? <p style={{ color: "var(--danger)", marginTop: 4 }}>エラー: {error}</p> : null}
    </div>
  );
}
