"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CorrectionForm({ date }: { date: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toIso(time: string): string | null {
    if (!time) return null;
    return new Date(`${date}T${time}:00+09:00`).toISOString();
  }

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
            requestedClockInAt: toIso(clockIn),
            requestedClockOutAt: toIso(clockOut),
            requestedBreakStartAt: toIso(breakStart),
            requestedBreakEndAt: toIso(breakEnd),
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

  const inputStyle = { padding: "6px 8px", border: "1px solid #ccc", borderRadius: 4 };

  return (
    <section style={{ marginTop: 16 }}>
      <h2>申請内容</h2>
      <p>
        対象日: <b>{date}</b>
      </p>

      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <fieldset style={{ border: "1px solid #ddd", padding: 12, borderRadius: 4 }}>
          <legend>希望時刻（任意）</legend>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 4 }}>
              出勤
              <input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              退勤
              <input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              休憩開始
              <input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              休憩終了
              <input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} style={inputStyle} />
            </label>
          </div>
        </fieldset>

        <label style={{ display: "grid", gap: 4 }}>
          理由（必須）
          <textarea
            required
            rows={4}
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #ccc", borderRadius: 4 }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          disabled={isPending || reason.trim().length === 0}
          onClick={submit}
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          {isPending ? "送信中…" : "申請する"}
        </button>
        {error ? <p style={{ color: "crimson" }}>エラー: {error}</p> : null}
      </div>
    </section>
  );
}
