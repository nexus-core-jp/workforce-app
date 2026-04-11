"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "EMPLOYEE" | "ADMIN";

interface Department {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  departmentId: string | null;
  departmentName: string | null;
  hireDateLabel: string | null;
  retiredAtLabel: string | null;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "OUTSOURCED";
}

const roleLabels: Record<string, string> = {
  EMPLOYEE: "従業員",
  ADMIN: "管理者",
};

const employmentLabels: Record<string, string> = {
  FULL_TIME: "正社員",
  PART_TIME: "パート",
  CONTRACT: "契約",
  OUTSOURCED: "委託",
};

export function MemberList({
  members,
  currentUserId,
  departments,
}: {
  members: Member[];
  currentUserId: string;
  departments: Department[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function action(userId: string, actionType: string, role?: Role) {
    setLoading(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: actionType, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "操作に失敗しました");
      } else {
        router.refresh();
      }
    } catch {
      setError("操作に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  async function changeDepartment(userId: string, departmentId: string | null) {
    setLoading(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, departmentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "部署変更に失敗しました");
      } else {
        router.refresh();
      }
    } catch {
      setError("部署変更に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>メンバー一覧（{members.length} 名）</h2>
      {error && <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>メール</th>
              <th>部署</th>
              <th>雇用形態</th>
              <th>入社日</th>
              <th>役割</th>
              <th>状態</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.id === currentUserId;
              const isLoading = loading === m.id;

              return (
                <tr key={m.id}>
                  <td>{m.name ?? "—"}</td>
                  <td style={{ fontFamily: "monospace" }}>{m.email}</td>
                  <td>
                    <select
                      value={m.departmentId ?? ""}
                      disabled={isLoading}
                      onChange={(e) =>
                        changeDepartment(m.id, e.target.value || null)
                      }
                      className="select-compact"
                      aria-label={`${m.name ?? m.email} の部署`}
                    >
                      <option value="">未所属</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {employmentLabels[m.employmentType] ?? m.employmentType}
                  </td>
                  <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    {m.hireDateLabel ?? "—"}
                  </td>
                  <td>
                    {isSelf ? (
                      <span className={`badge ${m.role === "ADMIN" ? "badge-closed" : "badge-open"}`}>
                        {roleLabels[m.role] ?? m.role}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        disabled={isLoading}
                        onChange={(e) => {
                          const newRole = e.target.value as Role;
                          if (!window.confirm(`${m.name ?? m.email} の役割を「${roleLabels[newRole]}」に変更しますか？`)) {
                            e.target.value = m.role;
                            return;
                          }
                          action(m.id, "changeRole", newRole);
                        }}
                        className="select-compact"
                        aria-label={`${m.name ?? m.email} の役割`}
                      >
                        <option value="EMPLOYEE">従業員</option>
                        <option value="ADMIN">管理者</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${m.active ? "badge-approved" : "badge-rejected"}`}>
                      {m.active ? "在籍" : "退社"}
                    </span>
                    {m.retiredAtLabel && (
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                        {m.retiredAtLabel}
                      </div>
                    )}
                  </td>
                  <td>
                    {isSelf ? (
                      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>—</span>
                    ) : m.active ? (
                      <button
                        data-variant="danger"
                        className="btn-compact"
                        disabled={isLoading}
                        onClick={() => {
                          if (!window.confirm(`${m.name ?? m.email} を退社処理しますか？\nこのメンバーはログインできなくなります。`)) return;
                          action(m.id, "deactivate");
                        }}
                      >
                        退社
                      </button>
                    ) : (
                      <button
                        data-variant="success"
                        className="btn-compact"
                        disabled={isLoading}
                        onClick={() => action(m.id, "reactivate")}
                      >
                        再入社
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
