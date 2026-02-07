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
    <section style={{ marginTop: 16 }}>
      <h2 style={{ marginBottom: 8 }}>直近7日</h2>
      <div style={{ overflowX: "auto" }}>
        <table cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
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
              <tr key={it.dateYmd} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td>{it.dateLabel}</td>
                <td>{formatLocal(it.clockInAt)}</td>
                <td>{formatLocal(it.breakStartAt)}</td>
                <td>{formatLocal(it.breakEndAt)}</td>
                <td>{formatLocal(it.clockOutAt)}</td>
                <td>{it.workMinutes} 分</td>
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
