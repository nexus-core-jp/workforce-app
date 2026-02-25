"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface LeaveRequestItem {
  id: string;
  userLabel: string;
  type: string;
  startAt: string;
  endAt: string;
  reason: string;
}

const TYPE_LABELS: Record<string, string> = {
  PAID: "有給休暇",
  HALF: "半休",
  HOURLY: "時間休",
  ABSENCE: "欠勤",
};

export function AdminLeaveRequests({ items }: { items: LeaveRequestItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const decide = (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leave-requests/decide", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, decision }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>
        休暇申請（承認待ち）
        {items.length > 0 && (
          <span className="badge badge-pending" style={{ marginLeft: 8 }}>
            {items.length} 件
          </span>
        )}
      </h2>
      {items.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          未処理の休暇申請はありません。
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>申請者</th>
                <th>種別</th>
                <th>期間</th>
                <th>理由</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.userLabel}</td>
                  <td>{TYPE_LABELS[item.type] ?? item.type}</td>
                  <td>
                    {item.startAt}
                    {item.type !== "HALF" && ` 〜 ${item.endAt}`}
                  </td>
                  <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.reason || "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn-compact"
                        data-variant="success"
                        disabled={isPending}
                        onClick={() => decide(item.id, "APPROVED")}
                      >
                        承認
                      </button>
                      <button
                        className="btn-compact"
                        data-variant="danger"
                        disabled={isPending}
                        onClick={() => decide(item.id, "REJECTED")}
                      >
                        却下
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error ? <p className="error-text">エラー: {error}</p> : null}
    </section>
  );
}
