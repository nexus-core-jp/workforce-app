"use client";

import { useState, useTransition } from "react";
import { PasswordInput } from "@/components/PasswordInput";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;

  const submit = () => {
    setError(null);
    setSuccess(false);

    if (next !== confirm) {
      setError("新しいパスワードが一致しません");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/users/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentPassword: current, newPassword: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setCurrent("");
        setNext("");
        setConfirm("");
        setSuccess(true);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>パスワード変更</h2>
      <div style={{ display: "grid", gap: 16, maxWidth: 400 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="current-pw" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
            現在のパスワード
          </label>
          <PasswordInput
            id="current-pw"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="new-pw" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
            新しいパスワード（8文字以上）
          </label>
          <PasswordInput
            id="new-pw"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          {tooShort && (
            <p style={{ fontSize: 12, color: "var(--color-warning)" }}>
              8文字以上入力してください（現在 {next.length} 文字）
            </p>
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="confirm-pw" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
            新しいパスワード（確認）
          </label>
          <PasswordInput
            id="confirm-pw"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          {mismatch && (
            <p style={{ fontSize: 12, color: "var(--color-danger)" }}>
              パスワードが一致しません
            </p>
          )}
        </div>

        <button
          disabled={isPending || !current || next.length < 8 || !confirm || mismatch}
          onClick={submit}
          data-variant="primary"
        >
          {isPending ? "変更中…" : "パスワードを変更"}
        </button>

        {error && <p className="error-text" role="alert">エラー: {error}</p>}
        {success && <p className="success-text" role="status">パスワードを変更しました</p>}
      </div>
    </section>
  );
}
