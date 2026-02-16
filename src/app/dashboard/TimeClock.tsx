"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: PunchAction) => {
    setError(null);
    startTransition(async () => {
      try {
        await punch(action);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <section style={{ marginTop: 16 }}>
      <h2 style={{ marginBottom: 8 }}>打刻</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={!props.canClockIn || isPending} onClick={() => run("CLOCK_IN")}>
          出勤
        </button>
        <button
          disabled={!props.canBreakStart || isPending}
          onClick={() => run("BREAK_START")}
        >
          休憩開始
        </button>
        <button disabled={!props.canBreakEnd || isPending} onClick={() => run("BREAK_END")}>
          休憩終了
        </button>
        <button disabled={!props.canClockOut || isPending} onClick={() => run("CLOCK_OUT")}>
          退勤
        </button>
      </div>
      {error ? (
        <p style={{ color: "crimson", marginTop: 8 }}>
          エラー: {error}
        </p>
      ) : null}
    </section>
  );
}
