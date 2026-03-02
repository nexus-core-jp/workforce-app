"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function GrantForm({ users }: { users: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState<"GRANT" | "ADJUST">("GRANT");
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date())
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setOpen(true)}>+ 有給付与 / 調整</button>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leave-balance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId, kind, days: parseFloat(days), note: note || undefined, effectiveDate }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setOpen(false);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 400 }}>
        <label style={{ display: "grid", gap: 4 }}>
          ユーザー
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">選択...</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          種別
          <select value={kind} onChange={(e) => setKind(e.target.value as "GRANT" | "ADJUST")}>
            <option value="GRANT">付与 (GRANT)</option>
            <option value="ADJUST">調整 (ADJUST)</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          日数
          <input type="number" min={0.5} step={0.5} value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          基準日
          <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          メモ（任意）
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={isPending || !userId || !days} onClick={submit}>
            {isPending ? "処理中…" : "登録"}
          </button>
          <button onClick={() => setOpen(false)}>キャンセル</button>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>エラー: {error}</p> : null}
      </div>
    </div>
  );
}
