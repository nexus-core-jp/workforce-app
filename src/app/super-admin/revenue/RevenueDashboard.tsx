"use client";

import { useEffect, useState } from "react";

interface RevenueData {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  conversionRate: number;
  churnRate: number;
  invoiceHistory: Array<{
    id: string;
    customerName: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
  }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
}

function formatJpy(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

export function RevenueDashboard() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/revenue")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
        else setError(d.error ?? "取得に失敗しました");
      })
      .catch(() => setError("ネットワークエラー"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "var(--color-danger)" }}>{error}</p>;
  if (!data) return null;

  return (
    <>
      {/* KPI Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}>
        <KpiCard label="MRR" value={formatJpy(data.mrr)} />
        <KpiCard label="ARR" value={formatJpy(data.arr)} />
        <KpiCard label="有料契約数" value={String(data.activeSubscriptions)} />
        <KpiCard label="転換率" value={`${data.conversionRate}%`} sub="トライアル→有料" />
        <KpiCard label="解約率" value={`${data.churnRate}%`} sub="停止/全決済済み" />
      </div>

      {/* Plan Breakdown */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}>
        <KpiCard label="全テナント" value={String(data.totalTenants)} />
        <KpiCard label="ACTIVE" value={String(data.activeTenants)} color="var(--color-success)" />
        <KpiCard label="TRIAL" value={String(data.trialTenants)} color="var(--color-primary)" />
        <KpiCard label="SUSPENDED" value={String(data.suspendedTenants)} color="var(--color-danger)" />
      </div>

      {/* Monthly Revenue */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>月別収益推移</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "end", height: 120 }}>
          {data.monthlyRevenue.map((m) => {
            const max = Math.max(...data.monthlyRevenue.map((r) => r.amount), 1);
            const h = Math.max(4, (m.amount / max) * 100);
            return (
              <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    height: h,
                    background: "var(--color-primary)",
                    borderRadius: 4,
                    marginBottom: 4,
                  }}
                  title={formatJpy(m.amount)}
                />
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {m.month.slice(5)}月
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Invoices */}
      <section>
        <h3 style={{ marginBottom: 8 }}>直近の支払い</h3>
        {data.invoiceHistory.length === 0 ? (
          <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>支払い履歴はありません</p>
        ) : (
          <div className="table-scroll">
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>顧客</th>
                  <th>金額</th>
                  <th>支払日</th>
                </tr>
              </thead>
              <tbody>
                {data.invoiceHistory.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.customerName}</td>
                    <td>{formatJpy(inv.amount)}</td>
                    <td>
                      {inv.paidAt
                        ? new Intl.DateTimeFormat("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }).format(new Date(inv.paidAt))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      padding: 16,
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "var(--color-text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
