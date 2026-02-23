"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "EMPLOYEE" | "APPROVER" | "ADMIN";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

const roleLabels: Record<Role, string> = {
  EMPLOYEE: "従業員",
  APPROVER: "承認者",
  ADMIN: "管理者",
};

export function MemberList({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function action(userId: string, actionType: string, role?: Role) {
    setLoading(userId);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: actionType, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "操作に失敗しました");
      } else {
        router.refresh();
      }
    } catch {
      alert("操作に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>メンバー一覧（{members.length} 名）</h2>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>メール</th>
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
                    {isSelf ? (
                      <span className={`badge ${m.role === "ADMIN" ? "badge-closed" : m.role === "APPROVER" ? "badge-pending" : "badge-open"}`}>
                        {roleLabels[m.role]}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        disabled={isLoading}
                        onChange={(e) => action(m.id, "changeRole", e.target.value as Role)}
                        className="select-compact"
                        aria-label={`${m.name ?? m.email} の役割`}
                      >
                        <option value="EMPLOYEE">従業員</option>
                        <option value="APPROVER">承認者</option>
                        <option value="ADMIN">管理者</option>
                      </select>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${m.active ? "badge-approved" : "badge-rejected"}`}>
                      {m.active ? "有効" : "退社"}
                    </span>
                  </td>
                  <td>
                    {isSelf ? (
                      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>—</span>
                    ) : m.active ? (
                      <button
                        data-variant="danger"
                        className="btn-compact"
                        disabled={isLoading}
                        onClick={() => action(m.id, "deactivate")}
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
