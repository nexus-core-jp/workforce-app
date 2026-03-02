import Link from "next/link";

import { formatTimeOnly } from "@/lib/time";
import styles from "./dashboard.module.css";

interface HistoryItem {
  dateLabel: string;
  dateYmd: string;
  clockInAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
  clockOutAt: Date | null;
  workMinutes: number;
}

export function History({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <section>
        <h2 style={{ marginBottom: 12 }}>直近7日間</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>表示できる勤怠データがありません</p>
      </section>
    );
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>直近7日</h2>

      {/* Desktop: table */}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">日付</th>
              <th scope="col">出勤</th>
              <th scope="col">休憩開始</th>
              <th scope="col">休憩終了</th>
              <th scope="col">退勤</th>
              <th scope="col">労働時間</th>
              <th scope="col"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.dateYmd} style={{ opacity: it.clockInAt ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{it.dateLabel}</td>
                <td>{formatTimeOnly(it.clockInAt)}</td>
                <td>{formatTimeOnly(it.breakStartAt)}</td>
                <td>{formatTimeOnly(it.breakEndAt)}</td>
                <td>{formatTimeOnly(it.clockOutAt)}</td>
                <td>
                  {it.workMinutes > 0
                    ? `${Math.floor(it.workMinutes / 60)}時間${it.workMinutes % 60}分`
                    : "-"}
                </td>
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
