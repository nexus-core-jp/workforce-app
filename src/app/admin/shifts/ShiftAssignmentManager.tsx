"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ShiftPattern {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
}

interface Member {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  userId: string;
  userName: string;
  shiftName: string;
  startDate: string;
  endDate: string;
}

export function ShiftAssignmentManager({
  patterns,
  members,
  assignments: initial,
}: {
  patterns: ShiftPattern[];
  members: Member[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState(initial);
  const [userId, setUserId] = useState(members[0]?.id ?? "");
  const [patternId, setPatternId] = useState(patterns[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assign = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/shift-assignments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId, shiftPatternId: patternId, startDate, endDate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        router.refresh();
        // Reload
        const res2 = await fetch("/api/admin/shift-assignments");
        const data2 = await res2.json();
        if (data2.ok) {
          setAssignments(
            data2.assignments.map((a: { id: string; user: { name: string | null; email: string }; shiftPattern: { name: string }; startDate: string; endDate: string }) => ({
              id: a.id,
              userId: "",
              userName: a.user.name ?? a.user.email,
              shiftName: a.shiftPattern.name,
              startDate: a.startDate.slice(0, 10),
              endDate: a.endDate.slice(0, 10),
            }))
          );
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/shift-assignments", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        setAssignments(assignments.filter((a) => a.id !== id));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  if (patterns.length === 0) {
    return (
      <section>
        <h2 style={{ marginBottom: 12 }}>シフト割り当て</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          先にシフトパターンを作成してください。
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>シフト割り当て</h2>

      {assignments.length > 0 && (
        <div className="table-scroll" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>メンバー</th>
                <th>シフト</th>
                <th>開始日</th>
                <th>終了日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.userName}</td>
                  <td><span className="badge badge-closed">{a.shiftName}</span></td>
                  <td>{a.startDate}</td>
                  <td>{a.endDate}</td>
                  <td>
                    <button className="btn-compact" data-variant="danger" disabled={isPending} onClick={() => remove(a.id)}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, maxWidth: 600 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>メンバー</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>シフト</span>
          <select value={patternId} onChange={(e) => setPatternId(e.target.value)}>
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.plannedStart}-{p.plannedEnd})</option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>開始日</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>終了日</span>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <button data-variant="primary" disabled={isPending || !startDate || !endDate} onClick={assign} style={{ marginTop: 8 }}>
        割り当て
      </button>
      {error && <p className="error-text">エラー: {error}</p>}
    </section>
  );
}
