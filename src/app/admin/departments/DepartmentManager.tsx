"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  approverUserId: string | null;
  approverLabel: string | null;
  memberCount: number;
}

interface Approver {
  id: string;
  label: string;
}

export function DepartmentManager({
  departments,
  approvers,
}: {
  departments: Department[];
  approvers: Approver[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newApprover, setNewApprover] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading("create");
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          approverUserId: newApprover || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "作成に失敗しました");
      } else {
        setSuccess("部署を作成しました");
        setNewName("");
        setNewApprover("");
        router.refresh();
      }
    } catch {
      setError("作成に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  async function handleApproverChange(deptId: string, approverUserId: string | null) {
    setError(null);
    setSuccess(null);
    setLoading(deptId);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deptId, action: "setApprover", approverUserId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "変更に失敗しました");
      } else {
        router.refresh();
      }
    } catch {
      setError("変更に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(dept: Department) {
    if (!confirm(`「${dept.name}」を削除しますか？\n所属メンバー ${dept.memberCount} 名は未所属になります。`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(dept.id);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dept.id, action: "delete" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "削除に失敗しました");
      } else {
        setSuccess("部署を削除しました");
        router.refresh();
      }
    } catch {
      setError("削除に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <section>
        <h2 style={{ marginBottom: 12 }}>部署を追加</h2>
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13 }}>部署名</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="例: 営業部"
              style={{ minWidth: 160 }}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13 }}>承認者</span>
            <select value={newApprover} onChange={(e) => setNewApprover(e.target.value)}>
              <option value="">なし</option>
              {approvers.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" data-variant="primary" disabled={loading === "create"}>
            {loading === "create" ? "追加中..." : "追加"}
          </button>
        </form>
        {error && <p className="error-text" role="alert" style={{ marginTop: 8 }}>{error}</p>}
        {success && <p style={{ color: "var(--color-success)", fontSize: 14, marginTop: 8 }}>{success}</p>}
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>部署一覧（{departments.length} 件）</h2>
        {departments.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            部署が登録されていません。上のフォームから追加してください。
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>部署名</th>
                  <th>承認者</th>
                  <th>メンバー数</th>
                  <th>アクション</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => {
                  const isLoading = loading === d.id;
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>{d.name}</td>
                      <td>
                        <select
                          value={d.approverUserId ?? ""}
                          disabled={isLoading}
                          onChange={(e) =>
                            handleApproverChange(d.id, e.target.value || null)
                          }
                          className="select-compact"
                          aria-label={`${d.name} の承認者`}
                        >
                          <option value="">なし</option>
                          {approvers.map((a) => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>{d.memberCount} 名</td>
                      <td>
                        <button
                          data-variant="danger"
                          className="btn-compact"
                          disabled={isLoading}
                          onClick={() => handleDelete(d)}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
