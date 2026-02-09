"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PUNCH_LABELS } from "@/lib/constants";
import styles from "./dashboard.module.css";

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

interface Props {
  canClockIn: boolean;
  canBreakStart: boolean;
  canBreakEnd: boolean;
  canClockOut: boolean;
  onToast: (text: string, type: "success" | "error") => void;
}

export function TimeClock(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: PunchAction) => {
    setError(null);
    startTransition(async () => {
      try {
        const data = await punch(action);
        const label = data.label ?? PUNCH_LABELS[action] ?? action;
        props.onToast(`${label}\u3057\u307e\u3057\u305f`, "success");
        router.refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "\u4e88\u671f\u3057\u306a\u3044\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f";
        setError(msg);
        props.onToast(msg, "error");
      }
    });
  };

  const buttons: { action: PunchAction; label: string; enabled: boolean; className: string }[] = [
    { action: "CLOCK_IN", label: "\u51fa\u52e4", enabled: props.canClockIn, className: "btn-primary" },
    { action: "BREAK_START", label: "\u4f11\u61a9\u958b\u59cb", enabled: props.canBreakStart, className: "" },
    { action: "BREAK_END", label: "\u4f11\u61a9\u7d42\u4e86", enabled: props.canBreakEnd, className: "" },
    { action: "CLOCK_OUT", label: "\u9000\u52e4", enabled: props.canClockOut, className: "btn-danger" },
  ];

  return (
    <section className={styles.section} aria-label="\u6253\u523b\u64cd\u4f5c">
      <h2 className={styles.sectionTitle}>\u6253\u523b</h2>
      <div className={styles.punchGrid}>
        {buttons.map((btn) => (
          <button
            key={btn.action}
            className={`${styles.punchBtn} ${btn.className}`}
            disabled={!btn.enabled || isPending}
            onClick={() => run(btn.action)}
            aria-busy={isPending}
          >
            {isPending && btn.enabled ? (
              <span className={`${styles.spinner} ${btn.className ? styles.spinnerWhite : ""}`} />
            ) : null}
            {btn.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className={styles.correctionReason} style={{ color: "var(--color-danger)", marginTop: "0.5rem" }}>
          {error}
        </p>
      )}
    </section>
  );
}
