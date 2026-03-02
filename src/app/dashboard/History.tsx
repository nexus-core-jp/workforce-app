import Link from "next/link";

import { formatLocal } from "@/lib/time";

export function History(props: {
  items: Array<{
    dateLabel: string;
    dateYmd: string;
    clockInAt: Date | null;
    breakStartAt: Date | null;
    breakEndAt: Date | null;
    clockOutAt: Date | null;
    workMinutes: number;
  }>;
}) {
  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>直近7日</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>出勤</th>
              <th>休憩開始</th>
              <th>休憩終了</th>
              <th>退勤</th>
              <th>労働分</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {props.items.map((it) => (
              <tr key={it.dateYmd} style={{ opacity: it.clockInAt ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{it.dateLabel}</td>
                <td>{it.clockInAt ? formatLocal(it.clockInAt) : <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>未出勤</span>}</td>
                <td>{formatLocal(it.breakStartAt)}</td>
                <td>{formatLocal(it.breakEndAt)}</td>
                <td>{formatLocal(it.clockOutAt)}</td>
                <td>{it.clockInAt ? `${it.workMinutes} 分` : "—"}</td>
                <td>
                  <Link href={`/corrections/new?date=${it.dateYmd}`}>修正申請</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
