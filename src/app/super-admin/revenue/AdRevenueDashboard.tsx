"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AdRevenueData {
  today: { impressions: number; clicks: number; ctr: number };
  monthly: Array<{
    month: string;
    impressions: number;
    clicks: number;
    ctr: number;
    estimatedRevenue: number;
  }>;
  bySlot: Array<{
    slotId: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  freeTenants: number;
  totalImpressions: number;
  totalClicks: number;
  estimatedMonthlyRevenue: number;
}

function formatJpy(amount: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

export function AdRevenueDashboard() {
  const [data, setData] = useState<AdRevenueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/ad-revenue")
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

  const chartData = data.monthly.map((m) => ({
    month: m.month.slice(5) + "月",
    インプレッション: m.impressions,
    クリック: m.clicks,
    推定収益: m.estimatedRevenue,
  }));

  return (
    <>
      {/* KPI Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}>
        <KpiCard label="今日のimp" value={data.today.impressions.toLocaleString()} />
        <KpiCard label="今日のクリック" value={data.today.clicks.toLocaleString()} />
        <KpiCard label="今日のCTR" value={`${data.today.ctr}%`} />
        <KpiCard
          label="推定月間広告収益"
          value={formatJpy(data.estimatedMonthlyRevenue)}
          color="var(--color-success)"
        />
        <KpiCard label="FREEテナント数" value={String(data.freeTenants)} />
        <KpiCard label="累計imp" value={data.totalImpressions.toLocaleString()} sub="過去6ヶ月" />
        <KpiCard label="累計クリック" value={data.totalClicks.toLocaleString()} sub="過去6ヶ月" />
      </div>

      {/* Monthly Chart */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>月別広告パフォーマンス（過去6ヶ月）</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis yAxisId="left" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="インプレッション" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="クリック" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="推定収益" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Monthly Revenue Table */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>月別推定収益</h3>
        <div className="table-scroll">
          <table style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>月</th>
                <th>imp数</th>
                <th>クリック数</th>
                <th>CTR</th>
                <th>推定収益</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{m.impressions.toLocaleString()}</td>
                  <td>{m.clicks.toLocaleString()}</td>
                  <td>{m.ctr}%</td>
                  <td>{formatJpy(m.estimatedRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Slot Performance */}
      {data.bySlot.length > 0 && (
        <section>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>スロット別パフォーマンス</h3>
          <div className="table-scroll">
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>スロットID</th>
                  <th>imp数</th>
                  <th>クリック数</th>
                  <th>CTR</th>
                </tr>
              </thead>
              <tbody>
                {data.bySlot.map((s) => (
                  <tr key={s.slotId}>
                    <td style={{ fontFamily: "monospace" }}>{s.slotId}</td>
                    <td>{s.impressions.toLocaleString()}</td>
                    <td>{s.clicks.toLocaleString()}</td>
                    <td>{s.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
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
