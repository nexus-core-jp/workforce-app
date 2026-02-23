"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface AuditLogFiltersProps {
  tenants: { id: string; name: string }[];
  actions: string[];
}

export function AuditLogFilters({ tenants, actions }: AuditLogFiltersProps) {
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
      params.delete("page"); // reset pagination on filter change
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <select
        value={searchParams.get("tenantId") ?? ""}
        onChange={(e) => update("tenantId", e.target.value)}
      >
        <option value="">全テナント</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

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
