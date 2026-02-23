"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function toISOStringOrNull(value: string): string | null {
  if (!value) return null;
  // datetime-local gives "YYYY-MM-DDTHH:MM", convert to ISO with JST offset
  return new Date(value + ":00+09:00").toISOString();
}

export function CorrectionForm({ date }: { date: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/attendance-corrections", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            date,
            reason,
            requestedClockInAt: toISOStringOrNull(clockIn),
            requestedClockOutAt: toISOStringOrNull(clockOut),
            requestedBreakStartAt: toISOStringOrNull(breakStart),
            requestedBreakEndAt: toISOStringOrNull(breakEnd),
          }),
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

      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>出勤時刻（修正後）</span>
          <input
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>休憩開始（修正後）</span>
          <input
            type="datetime-local"
            value={breakStart}
            onChange={(e) => setBreakStart(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>休憩終了（修正後）</span>
          <input
            type="datetime-local"
            value={breakEnd}
            onChange={(e) => setBreakEnd(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>退勤時刻（修正後）</span>
          <input
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>理由（必須）</span>
          <textarea
            required
            rows={4}
            style={{ width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
          変更したい項目のみ入力してください。空欄の項目は元の値が維持されます。
        </p>
        <button disabled={isPending || reason.trim().length === 0} onClick={submit}>
          申請する
        </button>
        {error ? <p style={{ color: "crimson" }}>エラー: {error}</p> : null}
      </div>
    </section>
  );
}
