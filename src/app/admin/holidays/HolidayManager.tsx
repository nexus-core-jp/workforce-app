"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface HolidayItem {
  id: string;
  date: string;
  name: string;
  recurring: boolean;
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function getDow(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function HolidayManager({
  holidays: initialHolidays,
  year,
}: {
  holidays: HolidayItem[];
  year: number;
}) {
  const router = useRouter();
  const [holidays, setHolidays] = useState(initialHolidays);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, name, recurring }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");

      setDate("");
      setName("");
      setRecurring(false);
      router.refresh();
      // Optimistic update
      setHolidays((prev) =>
        [...prev, { id: "temp-" + Date.now(), date, name, recurring }].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setError(null);

    try {
      const res = await fetch("/api/admin/holidays", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "削除に失敗しました");

      setHolidays((prev) => prev.filter((h) => h.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  const presets = [
    { label: "年末年始 (12/29-1/3)", dates: [
      { date: `${year}-12-29`, name: "年末休業" },
      { date: `${year}-12-30`, name: "年末休業" },
      { date: `${year}-12-31`, name: "年末休業" },
      { date: `${year + 1}-01-02`, name: "年始休業" },
      { date: `${year + 1}-01-03`, name: "年始休業" },
    ]},
    { label: "お盆 (8/13-8/16)", dates: [
      { date: `${year}-08-13`, name: "お盆休業" },
      { date: `${year}-08-14`, name: "お盆休業" },
      { date: `${year}-08-15`, name: "お盆休業" },
      { date: `${year}-08-16`, name: "お盆休業" },
    ]},
  ];

  const addPreset = async (dates: Array<{ date: string; name: string }>) => {
    setSaving(true);
    setError(null);
    let added = 0;
    for (const item of dates) {
      try {
        const res = await fetch("/api/admin/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: item.date, name: item.name, recurring: false }),
        });
        if (res.ok) added++;
      } catch { /* skip duplicates */ }
    }
    setSaving(false);
    if (added > 0) router.refresh();
  };

  return (
    <div>
      {/* Add form */}
      <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              日付
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{ padding: "6px 8px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
              名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例: 創立記念日"
              style={{ padding: "6px 8px", width: 200 }}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            毎年繰り返し
          </label>
          <button type="submit" disabled={saving} style={{ padding: "6px 16px" }}>
            {saving ? "追加中..." : "追加"}
          </button>
        </div>
      </form>

      {/* Presets */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginRight: 8 }}>
          一括追加:
        </span>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => addPreset(p.dates)}
            disabled={saving}
            style={{ marginRight: 8, padding: "4px 12px", fontSize: 13 }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--color-error, #c00)", marginBottom: 12 }}>{error}</p>}

      {/* Holiday list */}
      {holidays.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
          会社休業日は未登録です。追加すると給与計算の所定労働日から自動的に除外されます。
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-surface, #f8f9fa)" }}>
              <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "2px solid var(--color-border, #ddd)" }}>日付</th>
              <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "2px solid var(--color-border, #ddd)" }}>曜日</th>
              <th style={{ padding: "8px 6px", textAlign: "left", borderBottom: "2px solid var(--color-border, #ddd)" }}>名称</th>
              <th style={{ padding: "8px 6px", textAlign: "center", borderBottom: "2px solid var(--color-border, #ddd)" }}>毎年</th>
              <th style={{ padding: "8px 6px", textAlign: "right", borderBottom: "2px solid var(--color-border, #ddd)" }}></th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => {
              const dow = getDow(h.date);
              const isWeekend = dow === 0 || dow === 6;
              return (
                <tr key={h.id} style={{ borderBottom: "1px solid var(--color-border, #ddd)" }}>
                  <td style={{ padding: 6 }}>{h.date}</td>
                  <td style={{ padding: 6, color: isWeekend ? "var(--color-error, #c00)" : undefined }}>
                    {DAY_NAMES[dow]}
                  </td>
                  <td style={{ padding: 6 }}>{h.name}</td>
                  <td style={{ padding: 6, textAlign: "center" }}>{h.recurring ? "毎年" : ""}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(h.id)}
                      disabled={deleting === h.id}
                      style={{ padding: "2px 8px", fontSize: 12 }}
                    >
                      {deleting === h.id ? "..." : "削除"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
