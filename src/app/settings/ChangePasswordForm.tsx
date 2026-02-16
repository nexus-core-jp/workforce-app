"use client";

import { useState, useTransition } from "react";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  const inputStyle = { padding: "6px 8px", border: "1px solid #ccc", borderRadius: 4 };

  return (
    <section style={{ marginTop: 24 }}>
      <h2>パスワード変更</h2>
      <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
        <label style={{ display: "grid", gap: 4 }}>
          現在のパスワード
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          新しいパスワード（8文字以上）
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          新しいパスワード（確認）
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
        </label>
        <button disabled={isPending || !current || next.length < 8 || !confirm} onClick={submit}>
          {isPending ? "変更中…" : "変更する"}
        </button>
        {error ? <p style={{ color: "crimson" }}>エラー: {error}</p> : null}
        {success ? <p style={{ color: "green" }}>パスワードを変更しました</p> : null}
      </div>
    </section>
  );
}
