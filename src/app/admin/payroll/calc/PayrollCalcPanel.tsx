"use client";

import { useState } from "react";

interface PayrollRow {
  userId: string;
  userName: string;
  userEmail: string;
  workDays: number;
  absentDays: number;
  totalWorkMinutes: number;
  scheduledMinutes: number;
  overtimeMinutes: number;
  lateNightMinutes: number;
  holidayMinutes: number;
  basePay: number;
  overtimePay: number;
  lateNightPay: number;
  holidayPay: number;
  commuteAllowance: number;
  otherAllowances: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  overtime36Alert: {
    monthlyOvertimeHours: number;
    isOver45h: boolean;
    isOver80h: boolean;
    message: string;
  } | null;
}

export function PayrollCalcPanel({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PayrollRow[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setConfirmed(false);

    try {
      const res = await fetch("/api/admin/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "計算に失敗しました");
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "計算に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setShowConfirmPrompt(false);
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "確定に失敗しました");
      setResults(data.results);
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "確定に失敗しました");
    } finally {
      setConfirming(false);
    }
  };

  const download = (type: "payroll" | "bank-transfer" | "payroll-detail") => {
    window.location.href = `/api/admin/payroll/export?type=${type}&month=${month}`;
  };

  const fmt = (n: number) => n.toLocaleString("ja-JP");
  const fmtMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  const totalGross = results?.reduce((s, r) => s + r.grossPay, 0) ?? 0;
  const totalNet = results?.reduce((s, r) => s + r.netPay, 0) ?? 0;
  const alerts = results?.filter((r) => r.overtime36Alert) ?? [];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label>
          対象月：
          <input
            type="month"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setResults(null); setConfirmed(false); }}
            style={{ marginLeft: 4 }}
          />
        </label>
        <button type="button" onClick={calculate} disabled={loading}>
          {loading ? "計算中..." : "給与計算を実行"}
        </button>
      </div>

      {error && <p style={{ color: "var(--color-error, #c00)", marginBottom: 12 }}>{error}</p>}

      {/* 36 Agreement Alerts */}
      {alerts.length > 0 && (
        <div style={{
          marginBottom: 16,
          padding: "12px 16px",
          background: "#fff3e0",
          border: "1px solid #ffb74d",
          borderRadius: 8,
        }}>
          <strong style={{ color: "#e65100" }}>36協定アラート</strong>
          <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
            {alerts.map((r) => (
              <li key={r.userId} style={{
                color: r.overtime36Alert!.isOver80h ? "#c62828" : "#e65100",
                fontWeight: r.overtime36Alert!.isOver80h ? 700 : 400,
              }}>
                {r.userName || r.userEmail}: {r.overtime36Alert!.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {results && (
        <>
          {/* Summary */}
          <div style={{
            display: "flex",
            gap: 24,
            marginBottom: 16,
            padding: "12px 16px",
            background: "var(--color-surface, #f8f9fa)",
            borderRadius: 8,
          }}>
            <div>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>対象人数</span>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{results.length} 名</div>
            </div>
            <div>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>総支給額合計</span>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalGross)} 円</div>
            </div>
            <div>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>振込合計</span>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalNet)} 円</div>
            </div>
          </div>

          {/* Payroll table */}
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-surface, #f8f9fa)" }}>
                  <th style={thStyle}>社員名</th>
                  <th style={thStyle}>出勤</th>
                  <th style={thStyle}>欠勤</th>
                  <th style={thStyle}>総労働</th>
                  <th style={thStyle}>残業</th>
                  <th style={thStyle}>深夜</th>
                  <th style={thStyle}>休日</th>
                  <th style={thStyle}>基本給</th>
                  <th style={thStyle}>残業手当</th>
                  <th style={thStyle}>深夜手当</th>
                  <th style={thStyle}>休日手当</th>
                  <th style={thStyle}>手当計</th>
                  <th style={thStyle}>総支給</th>
                  <th style={thStyle}>差引支給</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.userId} style={{ borderBottom: "1px solid var(--color-border, #ddd)" }}>
                    <td style={tdStyle}>
                      {r.userName || r.userEmail}
                      {r.overtime36Alert && (
                        <span style={{
                          marginLeft: 4,
                          color: r.overtime36Alert.isOver80h ? "#c62828" : "#e65100",
                          fontSize: 11,
                        }}>
                          {r.overtime36Alert.isOver80h ? "!! 80h超" : "! 45h超"}
                        </span>
                      )}
                    </td>
                    <td style={tdStyleR}>{r.workDays}日</td>
                    <td style={tdStyleR}>{r.absentDays}日</td>
                    <td style={tdStyleR}>{fmtMin(r.totalWorkMinutes)}</td>
                    <td style={tdStyleR}>{fmtMin(r.overtimeMinutes)}</td>
                    <td style={tdStyleR}>{fmtMin(r.lateNightMinutes)}</td>
                    <td style={tdStyleR}>{fmtMin(r.holidayMinutes)}</td>
                    <td style={tdStyleR}>{fmt(r.basePay)}</td>
                    <td style={tdStyleR}>{fmt(r.overtimePay)}</td>
                    <td style={tdStyleR}>{fmt(r.lateNightPay)}</td>
                    <td style={tdStyleR}>{fmt(r.holidayPay)}</td>
                    <td style={tdStyleR}>{fmt(r.commuteAllowance + r.otherAllowances)}</td>
                    <td style={{ ...tdStyleR, fontWeight: 600 }}>{fmt(r.grossPay)}</td>
                    <td style={{ ...tdStyleR, fontWeight: 700 }}>{fmt(r.netPay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--color-surface, #f8f9fa)", fontWeight: 700 }}>
                  <td style={tdStyle}>合計</td>
                  <td style={tdStyleR}>{results.reduce((s, r) => s + r.workDays, 0)}日</td>
                  <td style={tdStyleR}>{results.reduce((s, r) => s + r.absentDays, 0)}日</td>
                  <td style={tdStyleR}>{fmtMin(results.reduce((s, r) => s + r.totalWorkMinutes, 0))}</td>
                  <td style={tdStyleR}>{fmtMin(results.reduce((s, r) => s + r.overtimeMinutes, 0))}</td>
                  <td style={tdStyleR}>{fmtMin(results.reduce((s, r) => s + r.lateNightMinutes, 0))}</td>
                  <td style={tdStyleR}>{fmtMin(results.reduce((s, r) => s + r.holidayMinutes, 0))}</td>
                  <td style={tdStyleR}>{fmt(results.reduce((s, r) => s + r.basePay, 0))}</td>
                  <td style={tdStyleR}>{fmt(results.reduce((s, r) => s + r.overtimePay, 0))}</td>
                  <td style={tdStyleR}>{fmt(results.reduce((s, r) => s + r.lateNightPay, 0))}</td>
                  <td style={tdStyleR}>{fmt(results.reduce((s, r) => s + r.holidayPay, 0))}</td>
                  <td style={tdStyleR}>
                    {fmt(results.reduce((s, r) => s + r.commuteAllowance + r.otherAllowances, 0))}
                  </td>
                  <td style={tdStyleR}>{fmt(totalGross)}</td>
                  <td style={tdStyleR}>{fmt(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
            {!confirmed && !showConfirmPrompt && (
              <button
                type="button"
                onClick={() => setShowConfirmPrompt(true)}
                disabled={confirming}
                style={{ fontWeight: 700 }}
              >
                {confirming ? "確定中..." : "給与を確定する"}
              </button>
            )}
            {!confirmed && showConfirmPrompt && (
              <div style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "8px 12px",
                background: "#fff3e0",
                border: "1px solid #ffb74d",
                borderRadius: 6,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{month} の給与を確定しますか？</span>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={confirming}
                  style={{ fontWeight: 700, background: "#e65100", color: "#fff", border: "none", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}
                >
                  {confirming ? "確定中..." : "確定する"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmPrompt(false)}
                  disabled={confirming}
                  style={{ padding: "4px 12px" }}
                >
                  キャンセル
                </button>
              </div>
            )}
            {confirmed && (
              <span style={{ color: "var(--color-success, #080)", fontWeight: 700, alignSelf: "center" }}>
                {month} の給与を確定しました
              </span>
            )}
            <button type="button" onClick={() => download("payroll")}>
              給与一覧CSV
            </button>
            <button type="button" onClick={() => download("payroll-detail")}>
              勤怠明細CSV
            </button>
            <button type="button" onClick={() => download("bank-transfer")}>
              振込データCSV (全銀)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 6px",
  textAlign: "left",
  fontSize: 12,
  borderBottom: "2px solid var(--color-border, #ddd)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "6px",
  whiteSpace: "nowrap",
};

const tdStyleR: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};
