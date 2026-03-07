"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface InvoiceItem {
  id: string;
  tenantName: string;
  tenantSlug: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  paidAt: string | null;
  confirmedByName: string | null;
}

export function InvoiceActions({ invoices }: { invoices: InvoiceItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = filter === "ALL" ? invoices : invoices.filter((i) => i.status === filter);

  async function confirmPayment(id: string) {
    if (!window.confirm("この請求書の入金を確認しますか？テナントがACTIVEに変更されます。")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/super-admin/invoices/${id}/confirm`, {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      }
    });
  }

  const statusLabels: Record<string, string> = {
    PENDING: "未入金",
    PAID: "入金済",
    CANCELLED: "キャンセル",
  };

  const statusBadgeClass: Record<string, string> = {
    PENDING: "badge-pending",
    PAID: "badge-approved",
    CANCELLED: "badge-rejected",
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["ALL", "PENDING", "PAID", "CANCELLED"].map((s) => (
          <button
            key={s}
            data-variant={filter === s ? "primary" : undefined}
            className="btn-compact"
            onClick={() => setFilter(s)}
          >
            {s === "ALL" ? "すべて" : statusLabels[s] ?? s}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>テナント</th>
              <th>金額</th>
              <th>ステータス</th>
              <th>請求日</th>
              <th>支払期限</th>
              <th>入金日</th>
              <th>確認者</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{inv.tenantName}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                    {inv.tenantSlug}
                  </div>
                </td>
                <td style={{ fontFamily: "monospace" }}>
                  ¥{inv.amount.toLocaleString()}
                </td>
                <td>
                  <span className={`badge ${statusBadgeClass[inv.status] ?? ""}`}>
                    {statusLabels[inv.status] ?? inv.status}
                  </span>
                </td>
                <td>{inv.createdAt}</td>
                <td>{inv.dueDate}</td>
                <td>{inv.paidAt ?? "—"}</td>
                <td>{inv.confirmedByName ?? "—"}</td>
                <td>
                  {inv.status === "PENDING" && (
                    <button
                      data-variant="success"
                      className="btn-compact"
                      disabled={isPending}
                      onClick={() => confirmPayment(inv.id)}
                    >
                      入金確認
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", opacity: 0.6 }}>
                  請求書なし
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
