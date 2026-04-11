"use client";

import { useState } from "react";

interface LeaveBalanceItem {
  name: string;
  granted: number;
  used: number;
  balance: number;
  consumptionRate: number;
  complianceLevel: "ok" | "warning" | "violation";
  daysShort: number;
  daysUntilDeadline: number | null;
  subjectTo5DayRule: boolean;
}

function ComplianceBadge({ item }: { item: LeaveBalanceItem }) {
  if (!item.subjectTo5DayRule) {
    return <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>対象外</span>;
  }
  if (item.complianceLevel === "ok") {
    return (
      <span
        style={{
          fontSize: 11,
          padding: "2px 6px",
          borderRadius: 4,
          background: "var(--color-success)",
          color: "white",
        }}
      >
        達成
      </span>
    );
  }
  if (item.complianceLevel === "warning") {
    return (
      <span
        style={{
          fontSize: 11,
          padding: "2px 6px",
          borderRadius: 4,
          background: "var(--color-warning)",
          color: "white",
        }}
        title={`あと${item.daysShort}日 / 期限まで${item.daysUntilDeadline}日`}
      >
        あと{item.daysShort}日
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 6px",
        borderRadius: 4,
        background: "var(--color-danger)",
        color: "white",
      }}
      title="5日取得義務違反"
    >
      違反
    </span>
  );
}

export function LeaveBalanceReport({ items }: { items: LeaveBalanceItem[] }) {
  const [grantMsg, setGrantMsg] = useState<string | null>(null);
  const [grantLoading, setGrantLoading] = useState(false);

  const violations = items.filter((i) => i.complianceLevel === "violation").length;
  const warnings = items.filter((i) => i.complianceLevel === "warning").length;

  const runAutoGrant = async () => {
    setGrantLoading(true);
    setGrantMsg(null);
    try {
      const res = await fetch("/api/admin/leave-grant", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setGrantMsg(
          data.created > 0
            ? `${data.created}件の自動付与を実行しました。ページを再読み込みしてください。`
            : "付与対象者はいませんでした。",
        );
      } else {
        setGrantMsg(`エラー: ${data.error ?? "unknown"}`);
      }
    } catch {
      setGrantMsg("通信エラーが発生しました");
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>有休消化率・5日取得義務</h2>
        <button type="button" onClick={runAutoGrant} disabled={grantLoading} data-variant="secondary" style={{ fontSize: 13 }}>
          {grantLoading ? "実行中..." : "年次有給を自動付与"}
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
        年10日以上の付与を受けた従業員は、付与日から1年以内に5日以上を取得させる義務があります(労働基準法第39条)
      </p>

      {(violations > 0 || warnings > 0) && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 6,
            background: violations > 0 ? "var(--color-danger-bg, #fee)" : "var(--color-warning-bg, #fffbea)",
            border: `1px solid ${violations > 0 ? "var(--color-danger)" : "var(--color-warning)"}`,
            fontSize: 13,
          }}
        >
          {violations > 0 && <strong>⚠️ {violations}名が5日取得義務の期限を過ぎて未達です。</strong>}
          {violations > 0 && warnings > 0 && <br />}
          {warnings > 0 && <span>期限まで残り3ヶ月以内で未達: {warnings}名</span>}
        </div>
      )}

      {grantMsg && (
        <div style={{ marginBottom: 12, padding: 8, borderRadius: 4, background: "var(--color-surface-subtle, #f0f0f0)", fontSize: 13 }}>
          {grantMsg}
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>データがありません。</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>付与</th>
                <th>使用</th>
                <th>残日数</th>
                <th>消化率</th>
                <th>5日取得義務</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>{item.granted} 日</td>
                  <td>{item.used} 日</td>
                  <td style={{ fontWeight: 600, color: item.balance <= 2 ? "var(--color-danger)" : undefined }}>
                    {item.balance} 日
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "var(--color-border)", borderRadius: 3, minWidth: 60 }}>
                        <div
                          style={{
                            width: `${Math.min(100, item.consumptionRate)}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: item.consumptionRate >= 50
                              ? "var(--color-success)"
                              : item.consumptionRate >= 25
                                ? "var(--color-warning)"
                                : "var(--color-danger)",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, minWidth: 36 }}>{item.consumptionRate}%</span>
                    </div>
                  </td>
                  <td><ComplianceBadge item={item} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
