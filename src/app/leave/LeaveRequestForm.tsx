"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const LEAVE_TYPES = [
  { value: "PAID", label: "有給休暇" },
  { value: "HALF", label: "半休" },
  { value: "HOURLY", label: "時間休" },
  { value: "ABSENCE", label: "欠勤" },
] as const;

export function LeaveRequestForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("PAID");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <section style={{ marginTop: 16 }}>
        <button onClick={() => setOpen(true)}>+ 休暇申請を作成</button>
      </section>
    );
  }

  const submit = () => {
    setError(null);
    if (!startDate || !endDate) {
      setError("開始日と終了日を入力してください");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/leave-requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            startAt: new Date(`${startDate}T00:00:00+09:00`).toISOString(),
            endAt: new Date(`${endDate}T23:59:59+09:00`).toISOString(),
            reason: reason || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setOpen(false);
        setStartDate("");
        setEndDate("");
        setReason("");
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <section style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
      <h2>新規休暇申請</h2>
      <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
        <label style={{ display: "grid", gap: 4 }}>
          種別
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
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
        <label style={{ display: "grid", gap: 4 }}>
          理由（任意）
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%" }} />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={isPending || !startDate || !endDate} onClick={submit}>
            {isPending ? "申請中…" : "申請する"}
          </button>
          <button onClick={() => setOpen(false)} type="button">キャンセル</button>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>エラー: {error}</p> : null}
      </div>
    </section>
  );
}
