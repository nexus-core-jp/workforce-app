"use client";

import { useState, useEffect, useTransition } from "react";

interface OvertimeSummary {
  userId: string;
  userName: string;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  workDays: number;
  exceeds36Agreement: boolean;
  overtimePercentage: number;
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

export function OvertimePanel({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const [summaries, setSummaries] = useState<OvertimeSummary[]>([]);
  const [alerts, setAlerts] = useState<OvertimeSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = (m: string) => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/overtime?month=${m}`);
        const data = await res.json();
        if (data.ok) {
          setSummaries(data.summaries);
          setAlerts(data.alerts);
        } else {
          setError(data.error ?? "データの取得に失敗しました");
        }
      } catch {
        setError("データの取得に失敗しました");
      }
    });
  };

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>
        残業レポート
        {alerts.length > 0 && (
          <span className="badge badge-rejected" style={{ marginLeft: 8 }}>
            要注意 {alerts.length} 名
          </span>
        )}
      </h2>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ width: "auto" }}
        />
        <button className="btn-compact" disabled={isPending} onClick={() => load(month)}>
          表示
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ padding: "12px 16px", marginBottom: 12, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
          <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: 4 }}>
            36協定 残業上限アラート（月45時間の80%超過）
          </div>
          {alerts.map((a) => (
            <div key={a.userId} style={{ fontSize: 13, color: "#991b1b" }}>
              {a.userName}: {formatMin(a.totalOvertimeMinutes)}（{a.overtimePercentage}%）
              {a.exceeds36Agreement && " ⚠ 上限超過"}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="error-text" role="alert" style={{ marginBottom: 12 }}>{error}</p>
      )}

      {summaries.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          {isPending ? "読み込み中..." : "該当月のデータがありません。"}
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>出勤日数</th>
                <th>総労働</th>
                <th>残業</th>
                <th>36協定</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.userId}>
                  <td>{s.userName}</td>
                  <td>{s.workDays} 日</td>
                  <td>{formatMin(s.totalWorkMinutes)}</td>
                  <td style={{ fontWeight: s.totalOvertimeMinutes > 0 ? 600 : 400, color: s.overtimePercentage >= 80 ? "var(--color-danger)" : undefined }}>
                    {formatMin(s.totalOvertimeMinutes)}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "var(--color-border)", borderRadius: 3, minWidth: 60 }}>
                        <div
                          style={{
                            width: `${Math.min(100, s.overtimePercentage)}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: s.overtimePercentage >= 100
                              ? "var(--color-danger)"
                              : s.overtimePercentage >= 80
                                ? "var(--color-warning)"
                                : "var(--color-success)",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, minWidth: 36 }}>{s.overtimePercentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
