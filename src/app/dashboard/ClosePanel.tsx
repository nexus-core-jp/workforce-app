"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "./ConfirmDialog";
import styles from "./dashboard.module.css";

interface Props {
  isAdmin: boolean;
  month: string;
  isClosed: boolean;
  onToast: (text: string, type: "success" | "error") => void;
}

export function ClosePanel(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!props.isAdmin) return null;

  const executeClose = () => {
    setShowConfirm(false);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/close", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ month: props.month }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        props.onToast(`${props.month} \u306e\u7de0\u3081\u51e6\u7406\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f`, "success");
        router.refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f";
        setError(msg);
        props.onToast(msg, "error");
      }
    });
  };

  return (
    <section className={styles.section} aria-label="\u6708\u6b21\u7de0\u3081">
      <h2 className={styles.sectionTitle}>\u7de0\u3081\uff08\u7ba1\u7406\u8005\uff09</h2>
      <div className={styles.closeStatus}>
        <span style={{ fontSize: "0.875rem" }}>\u5bfe\u8c61\u6708: <strong>{props.month}</strong></span>
        <span className={`${styles.badge} ${props.isClosed ? styles.badgeClosed : styles.badgeOpen}`}>
          {props.isClosed ? "\u7de0\u3081\u6e08\u307f" : "\u672a\u7de0\u3081"}
        </span>
        {!props.isClosed && (
          <button
            className="btn-primary"
            disabled={isPending}
            onClick={() => setShowConfirm(true)}
            aria-busy={isPending}
          >
            {isPending && <span className={`${styles.spinner} ${styles.spinnerWhite}`} />}
            \u4eca\u6708\u3092\u7de0\u3081\u308b
          </button>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
          {error}
        </p>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="\u6708\u6b21\u7de0\u3081\u306e\u5b9f\u884c"
        message={`${props.month} \u306e\u52e4\u6020\u30c7\u30fc\u30bf\u3092\u7de0\u3081\u307e\u3059\u3002\u7de0\u3081\u5f8c\u306f\u5f53\u6708\u306e\u6253\u523b\u30fb\u4fee\u6b63\u304c\u3067\u304d\u306a\u304f\u306a\u308a\u307e\u3059\u3002\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f`}
        confirmLabel="\u7de0\u3081\u3092\u5b9f\u884c"
        variant="danger"
        onConfirm={executeClose}
        onCancel={() => setShowConfirm(false)}
      />
    </section>
  );
}
