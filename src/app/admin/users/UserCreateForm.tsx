"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UserCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EMPLOYEE" | "APPROVER" | "ADMIN">("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <section style={{ marginTop: 24 }}>
        <button onClick={() => setOpen(true)}>+ ユーザーを追加</button>
      </section>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, name, password, role }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setEmail("");
        setName("");
        setPassword("");
        setRole("EMPLOYEE");
        setOpen(false);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const inputStyle = { padding: "6px 8px", border: "1px solid #ccc", borderRadius: 4 };

  return (
    <section style={{ marginTop: 24, border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h2>新規ユーザー</h2>
      <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
        <label style={{ display: "grid", gap: 4 }}>
          名前
          <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          メール
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          パスワード（8文字以上）
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          ロール
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} style={inputStyle}>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="APPROVER">APPROVER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={isPending || !email || !name || password.length < 8} onClick={submit}>
            {isPending ? "作成中…" : "作成"}
          </button>
          <button onClick={() => setOpen(false)} type="button">
            キャンセル
          </button>
        </div>
        {error ? <p style={{ color: "crimson" }}>エラー: {error}</p> : null}
      </div>
    </section>
  );
}
