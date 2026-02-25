"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ShiftPattern {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  defaultBreakMinutes: number;
}

export function ShiftPatternManager({ patterns: initial }: { patterns: ShiftPattern[] }) {
  const router = useRouter();
  const [patterns, setPatterns] = useState(initial);
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [breakMin, setBreakMin] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const create = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/shifts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, plannedStart: start, plannedEnd: end, defaultBreakMinutes: breakMin }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setName("");
        router.refresh();
        // Reload patterns
        const res2 = await fetch("/api/admin/shifts");
        const data2 = await res2.json();
        if (data2.ok) setPatterns(data2.patterns);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/shifts", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setPatterns(patterns.filter((p) => p.id !== id));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>シフトパターン</h2>

      {patterns.length > 0 && (
        <div className="table-scroll" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>開始</th>
                <th>終了</th>
                <th>休憩</th>
                <th>実働</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => {
                const [sh, sm] = p.plannedStart.split(":").map(Number);
                const [eh, em] = p.plannedEnd.split(":").map(Number);
                const totalMin = (eh * 60 + em) - (sh * 60 + sm);
                const workMin = totalMin - p.defaultBreakMinutes;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.plannedStart}</td>
                    <td>{p.plannedEnd}</td>
                    <td>{p.defaultBreakMinutes}分</td>
                    <td>{Math.floor(workMin / 60)}h{workMin % 60}m</td>
                    <td>
                      <button className="btn-compact" data-variant="danger" disabled={isPending} onClick={() => remove(p.id)}>
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, maxWidth: 600 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>パターン名</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 早番" />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>開始時刻</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>終了時刻</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>休憩(分)</span>
          <input type="number" value={breakMin} onChange={(e) => setBreakMin(Number(e.target.value))} min={0} max={480} />
        </label>
      </div>
      <button data-variant="primary" disabled={isPending || !name.trim()} onClick={create} style={{ marginTop: 8 }}>
        パターンを追加
      </button>
      {error && <p className="error-text">エラー: {error}</p>}
    </section>
  );
}
