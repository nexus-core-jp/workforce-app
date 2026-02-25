"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  PAID: "有給休暇",
  HALF: "半休",
  HOURLY: "時間休",
  ABSENCE: "欠勤",
};

export function LeaveRequestForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [type, setType] = useState("PAID");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leave-requests", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            startAt: new Date(startAt + "T00:00:00+09:00").toISOString(),
            endAt: new Date(endAt + "T23:59:59+09:00").toISOString(),
            reason,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        router.push("/leave-requests");
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const isValid = startAt && endAt && (type === "ABSENCE" || type === "HOURLY" || balance > 0);

  return (
    <section style={{ marginTop: 16 }}>
      <h2>申請内容</h2>

      <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "var(--color-bg)" }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>有休残日数: </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: balance <= 2 ? "var(--color-danger)" : "var(--color-success)" }}>
          {balance} 日
        </span>
      </div>

      <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>休暇種別</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>{type === "HALF" ? "対象日" : "開始日"}</span>
          <input
            type="date"
            value={startAt}
            onChange={(e) => {
              setStartAt(e.target.value);
              if (type === "HALF" || !endAt) setEndAt(e.target.value);
            }}
          />
        </label>

        {type !== "HALF" && (
          <label style={{ display: "grid", gap: 4 }}>
            <span>終了日</span>
            <input
              type="date"
              value={endAt}
              min={startAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </label>
        )}

        <label style={{ display: "grid", gap: 4 }}>
          <span>理由（任意）</span>
          <textarea
            rows={3}
            style={{ width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例: 家庭の事情のため"
          />
        </label>

        <button
          data-variant="primary"
          disabled={isPending || !isValid}
          onClick={submit}
        >
          申請する
        </button>
        {error ? <p className="error-text" role="alert">エラー: {error}</p> : null}
      </div>
    </section>
  );
}
