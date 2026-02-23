"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface KpiChartsProps {
  monthlyRegistrations: { month: string; count: number }[];
  planDistribution: { name: string; value: number }[];
  dailyActive: { date: string; count: number }[];
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#f59e0b",
  ACTIVE: "#22c55e",
  SUSPENDED: "#ef4444",
};

export function KpiCharts({
  monthlyRegistrations,
  planDistribution,
  dailyActive,
}: KpiChartsProps) {
  return (
    <div style={{ display: "grid", gap: 24, marginBottom: 32 }}>
      {/* Monthly registrations bar chart */}
      <div>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>月別新規登録数（過去6ヶ月）</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyRegistrations}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" name="新規登録" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Plan distribution pie chart */}
      <div>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>プラン分布</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={planDistribution}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {planDistribution.map((entry) => (
                <Cell key={entry.name} fill={PLAN_COLORS[entry.name] ?? "#8884d8"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Daily active users line chart */}
      <div>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>日別アクティブユーザー数（過去30日）</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dailyActive}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="count" name="アクティブ" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
