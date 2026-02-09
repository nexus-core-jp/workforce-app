"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "./ConfirmDialog";
import styles from "./dashboard.module.css";

interface PendingCorrection {
  id: string;
  userLabel: string;
  dateLabel: string;
  reason: string;
}

interface Props {
  isAdminOrApprover: boolean;
  pendingCount: number;
  pendingForApproval: PendingCorrection[];
  onToast: (text: string, type: "success" | "error") => void;
}

export function CorrectionsPanel(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ id: string; decision: "APPROVED" | "REJECTED" } | null>(null);

  const decide = (id: string, decision: "APPROVED" | "REJECTED") => {
    setConfirm({ id, decision });
  };

  const executeDecision = () => {
    if (!confirm) return;
    const { id, decision } = confirm;
    setConfirm(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/attendance-corrections/decide", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, decision }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        props.onToast(decision === "APPROVED" ? "\u627f\u8a8d\u3057\u307e\u3057\u305f" : "\u5374\u4e0b\u3057\u307e\u3057\u305f", "success");
        router.refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f";
        setError(msg);
        props.onToast(msg, "error");
      }
    });
  };

  if (!props.isAdminOrApprover) {
    return (
      <section className={styles.section} aria-label="\u6253\u523b\u4fee\u6b63\u7533\u8acb">
        <h2 className={styles.sectionTitle}>\u6253\u523b\u4fee\u6b63\u7533\u8acb</h2>
        <p style={{ fontSize: "0.875rem" }}>
          \u3042\u306a\u305f\u306e\u672a\u51e6\u7406\u7533\u8acb: <strong>{props.pendingCount}\u4ef6</strong>
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="\u6253\u523b\u4fee\u6b63\u7533\u8acb\uff08\u627f\u8a8d\uff09">
      <h2 className={styles.sectionTitle}>\u6253\u523b\u4fee\u6b63\u7533\u8acb\uff08\u627f\u8a8d\uff09</h2>

      {props.pendingForApproval.length === 0 ? (
        <p className={styles.emptyState}>\u672a\u51e6\u7406\u306e\u7533\u8acb\u306f\u3042\u308a\u307e\u305b\u3093</p>
      ) : (
        <div>
          {props.pendingForApproval.map((p) => (
            <div key={p.id} className={styles.correctionItem}>
              <div className={styles.correctionMeta}>
                <strong>{p.dateLabel}</strong> / {p.userLabel}
              </div>
              <div className={styles.correctionReason}>\u7406\u7531: {p.reason}</div>
              <div className={styles.correctionActions}>
                <button
                  className="btn-success"
                  disabled={isPending}
                  onClick={() => decide(p.id, "APPROVED")}
                  aria-busy={isPending}
                >
                  {isPending && <span className={`${styles.spinner} ${styles.spinnerWhite}`} />}
                  \u627f\u8a8d
                </button>
                <button
                  className="btn-danger"
                  disabled={isPending}
                  onClick={() => decide(p.id, "REJECTED")}
                  aria-busy={isPending}
                >
                  \u5374\u4e0b
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
          {error}
        </p>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.decision === "APPROVED" ? "\u7533\u8acb\u3092\u627f\u8a8d" : "\u7533\u8acb\u3092\u5374\u4e0b"}
        message={
          confirm?.decision === "APPROVED"
            ? "\u3053\u306e\u4fee\u6b63\u7533\u8acb\u3092\u627f\u8a8d\u3057\u307e\u3059\u304b\uff1f\u3053\u306e\u64cd\u4f5c\u306f\u53d6\u308a\u6d88\u305b\u307e\u305b\u3093\u3002"
            : "\u3053\u306e\u4fee\u6b63\u7533\u8acb\u3092\u5374\u4e0b\u3057\u307e\u3059\u304b\uff1f\u3053\u306e\u64cd\u4f5c\u306f\u53d6\u308a\u6d88\u305b\u307e\u305b\u3093\u3002"
        }
        confirmLabel={confirm?.decision === "APPROVED" ? "\u627f\u8a8d\u3059\u308b" : "\u5374\u4e0b\u3059\u308b"}
        variant={confirm?.decision === "REJECTED" ? "danger" : "default"}
        onConfirm={executeDecision}
        onCancel={() => setConfirm(null)}
      />
    </section>
  );
}
