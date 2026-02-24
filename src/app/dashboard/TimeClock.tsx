"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PunchAction = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";

async function punch(action: PunchAction) {
  const res = await fetch("/api/time-entry/punch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

export function TimeClock(props: {
  canClockIn: boolean;
  canBreakStart: boolean;
  canBreakEnd: boolean;
  canClockOut: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClockOut, setConfirmClockOut] = useState(false);

  const run = async (action: PunchAction) => {
    setError(null);
    setLoading(true);
    try {
      await punch(action);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "打刻に失敗しました");
    } finally {
      setLoading(false);
      setConfirmClockOut(false);
    }
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>打刻</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          data-variant="primary"
          disabled={!props.canClockIn || loading}
          onClick={() => run("CLOCK_IN")}
        >
          {loading ? "処理中..." : "出勤"}
        </button>
        <button
          disabled={!props.canBreakStart || loading}
          onClick={() => run("BREAK_START")}
        >
          休憩開始
        </button>
        <button
          disabled={!props.canBreakEnd || loading}
          onClick={() => run("BREAK_END")}
        >
          休憩終了
        </button>
        {confirmClockOut ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              data-variant="danger"
              disabled={loading}
              onClick={() => run("CLOCK_OUT")}
            >
              {loading ? "処理中..." : "退勤する"}
            </button>
            <button
              className="btn-compact"
              disabled={loading}
              onClick={() => setConfirmClockOut(false)}
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            data-variant="danger"
            disabled={!props.canClockOut || loading}
            onClick={() => setConfirmClockOut(true)}
          >
            退勤
          </button>
        )}
      </div>
      {error ? <p className="error-text">エラー: {error}</p> : null}
    </section>
  );
}
