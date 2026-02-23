"use client";

import { useState } from "react";

export function ExportPanel({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);

  const download = (type: "attendance" | "daily-reports") => {
    window.location.href = `/api/admin/export?type=${type}&month=${month}`;
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>CSVエクスポート</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          対象月：
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ marginLeft: 4 }}
          />
        </label>
        <button type="button" onClick={() => download("attendance")}>
          勤怠CSV
        </button>
        <button type="button" onClick={() => download("daily-reports")}>
          日報CSV
        </button>
      </div>
    </section>
  );
}
