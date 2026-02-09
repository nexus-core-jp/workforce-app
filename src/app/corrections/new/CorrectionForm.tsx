"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { REASON_MAX_LENGTH } from "@/lib/constants";
import styles from "./corrections.module.css";

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
        const msg = e instanceof Error ? e.message : "\u4e88\u671f\u3057\u306a\u3044\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f";
        setError(msg);
      }
    });
  };

  return (
    <div>
      <div className={styles.field}>
        <label htmlFor="reason" className={styles.fieldLabel}>
          \u4fee\u6b63\u7406\u7531\uff08\u5fc5\u9808\uff09
        </label>
        <textarea
          id="reason"
          required
          rows={4}
          maxLength={REASON_MAX_LENGTH}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="\u4fee\u6b63\u304c\u5fc5\u8981\u306a\u7406\u7531\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044"
          aria-describedby="reason-count"
        />
        <span id="reason-count" className={styles.charCount}>
          {reason.length} / {REASON_MAX_LENGTH}
        </span>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.submitRow}>
        <button
          className="btn-primary"
          disabled={isPending || reason.trim().length === 0}
          onClick={submit}
          aria-busy={isPending}
        >
          {isPending && <span className={styles.spinner} />}
          {isPending ? "\u9001\u4fe1\u4e2d\u2026" : "\u7533\u8acb\u3059\u308b"}
        </button>
      </div>
    </div>
  );
}
