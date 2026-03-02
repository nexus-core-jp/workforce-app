"use client";

import { useState } from "react";

type ExportType = "attendance" | "daily-reports" | "corrections" | "leave-requests" | "leave-balance" | "members" | "audit-logs";

export function ExportPanel({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);

  const download = (type: ExportType) => {
    const needsMonth = type !== "members" && type !== "leave-balance";
    const params = needsMonth ? `type=${type}&month=${month}` : `type=${type}`;
    window.location.href = `/api/admin/export?${params}`;
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>CSVエクスポート</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <label>
          対象月：
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ marginLeft: 4 }}
          />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => download("attendance")}>
          勤怠CSV
        </button>
        <button type="button" onClick={() => download("daily-reports")}>
          日報CSV
        </button>
        <button type="button" onClick={() => download("corrections")}>
          修正申請CSV
        </button>
        <button type="button" onClick={() => download("leave-requests")}>
          休暇申請CSV
        </button>
        <button type="button" onClick={() => download("audit-logs")}>
          監査ログCSV
        </button>
        <button type="button" onClick={() => download("members")}>
          メンバーCSV
        </button>
        <button type="button" onClick={() => download("leave-balance")}>
          有休台帳CSV
        </button>
      </div>
    </section>
  );
}
