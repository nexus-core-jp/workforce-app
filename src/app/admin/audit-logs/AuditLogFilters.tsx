"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface AuditLogFiltersProps {
  actions: string[];
}

export function AuditLogFilters({ actions }: AuditLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <select
        value={searchParams.get("action") ?? ""}
        onChange={(e) => update("action", e.target.value)}
      >
        <option value="">全アクション</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={searchParams.get("from") ?? ""}
        onChange={(e) => update("from", e.target.value)}
        placeholder="開始日"
      />
      <input
        type="date"
        value={searchParams.get("to") ?? ""}
        onChange={(e) => update("to", e.target.value)}
        placeholder="終了日"
      />
    </div>
  );
}
