"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
}

export function AddMemberForm({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EMPLOYEE" | "ADMIN">("EMPLOYEE");
  const [departmentId, setDepartmentId] = useState<string>("");
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
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          departmentId: departmentId || null,
        }),
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
        setDepartmentId("");
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
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            8文字以上、大文字・小文字・数字を各1文字以上
          </span>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>役割</span>
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="EMPLOYEE">従業員</option>
            <option value="ADMIN">管理者</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>部署</span>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">未所属</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {departments.length === 0 && (
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              部署は管理画面の部署管理から追加できます
            </span>
          )}
        </label>

        <button type="submit" data-variant="primary" disabled={loading}>
          {loading ? "追加中..." : "メンバーを追加"}
        </button>

        {error && <p className="error-text" role="alert">{error}</p>}
        {success && (
          <p style={{ color: "var(--color-success)", fontSize: 14 }}>
            メンバーを追加しました
          </p>
        )}
      </form>
    </section>
  );
}
