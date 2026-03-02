"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DepartmentCreateForm({
  users,
}: {
  users: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [approverId, setApproverId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div style={{ marginTop: 16 }}>
        <button onClick={() => setOpen(true)}>+ 部署を追加</button>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/departments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, approverUserId: approverId || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setName("");
        setApproverId("");
        setOpen(false);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
      <h2>新規部署</h2>
      <div style={{ display: "grid", gap: 8, maxWidth: 400 }}>
        <label style={{ display: "grid", gap: 4 }}>
          部署名
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          承認者（任意）
          <select value={approverId} onChange={(e) => setApproverId(e.target.value)}>
            <option value="">未設定</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={isPending || !name} onClick={submit}>{isPending ? "作成中…" : "作成"}</button>
          <button onClick={() => setOpen(false)}>キャンセル</button>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>エラー: {error}</p> : null}
      </div>
    </div>
  );
}
