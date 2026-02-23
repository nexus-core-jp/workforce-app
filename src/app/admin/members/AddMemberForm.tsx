"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddMemberForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EMPLOYEE" | "APPROVER" | "ADMIN">("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "追加に失敗しました");
      } else {
        setSuccess(true);
        setName("");
        setEmail("");
        setPassword("");
        setRole("EMPLOYEE");
        router.refresh();
      }
    } catch {
      setError("追加に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>メンバー追加</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 12, maxWidth: 480 }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span>名前</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>メールアドレス</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="off"
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>パスワード</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>役割</span>
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="EMPLOYEE">従業員</option>
            <option value="APPROVER">承認者</option>
            <option value="ADMIN">管理者</option>
          </select>
        </label>

        <button type="submit" data-variant="primary" disabled={loading}>
          {loading ? "追加中..." : "メンバーを追加"}
        </button>

        {error && <p className="error-text">{error}</p>}
        {success && (
          <p style={{ color: "var(--color-success)", fontSize: 14 }}>
            メンバーを追加しました
          </p>
        )}
      </form>
    </section>
  );
}
