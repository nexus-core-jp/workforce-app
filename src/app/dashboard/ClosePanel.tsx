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
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

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
        props.onToast(`${props.month} の締め処理が完了しました`, "success");
        router.refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "エラーが発生しました";
        setError(msg);
        props.onToast(msg, "error");
      }
    });
  };

  const reopen = () => {
    setShowReopenConfirm(false);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/close/reopen", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ month: props.month }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        props.onToast(`${props.month} の締めを解除しました`, "success");
        router.refresh();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "エラーが発生しました";
        setError(msg);
        props.onToast(msg, "error");
      }
    });
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>月次締め（管理者）</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>対象月: </span>
          <span style={{ fontWeight: 600 }}>{props.month}</span>
        </div>
        <span className={`badge ${props.isClosed ? "badge-closed" : "badge-open"}`}>
          {props.isClosed ? "締め済み" : "未締め"}
        </span>
        {!props.isClosed && (
          <button data-variant="primary" disabled={isPending} onClick={() => setShowConfirm(true)}>
            今月を締める
          </button>
        )}
        {props.isClosed && (
          <button data-variant="danger" disabled={isPending} onClick={() => setShowReopenConfirm(true)}>
            締め解除
          </button>
        )}
      </div>
      {error && <p className="error-text">エラー: {error}</p>}

      <ConfirmDialog
        open={showConfirm}
        title="月次締めの実行"
        message={`${props.month} の勤怠データを締めます。締め後は当月の打刻・修正ができなくなります。よろしいですか？`}
        confirmLabel="締めを実行"
        variant="danger"
        onConfirm={executeClose}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmDialog
        open={showReopenConfirm}
        title="締め解除の実行"
        message={`${props.month} の締めを解除しますか？打刻の修正が可能になります。`}
        confirmLabel="締め解除"
        variant="danger"
        onConfirm={reopen}
        onCancel={() => setShowReopenConfirm(false)}
      />
    </section>
  );
}
