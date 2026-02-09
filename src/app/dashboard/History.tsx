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
      <section className={styles.section} aria-label="\u52e4\u6020\u5c65\u6b74">
        <h2 className={styles.sectionTitle}>\u76f4\u8fd17\u65e5\u9593</h2>
        <p className={styles.emptyState}>\u8868\u793a\u3067\u304d\u308b\u52e4\u6020\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093</p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="\u52e4\u6020\u5c65\u6b74">
      <h2 className={styles.sectionTitle}>\u76f4\u8fd17\u65e5\u9593</h2>

      {/* Desktop: table */}
      <div className={styles.desktopTable}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">\u65e5\u4ed8</th>
                <th scope="col">\u51fa\u52e4</th>
                <th scope="col">\u4f11\u61a9\u958b\u59cb</th>
                <th scope="col">\u4f11\u61a9\u7d42\u4e86</th>
                <th scope="col">\u9000\u52e4</th>
                <th scope="col">\u52b4\u50cd\u6642\u9593</th>
                <th scope="col"><span className="sr-only">\u64cd\u4f5c</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.dateYmd}>
                  <td>{it.dateLabel}</td>
                  <td>{formatTimeOnly(it.clockInAt)}</td>
                  <td>{formatTimeOnly(it.breakStartAt)}</td>
                  <td>{formatTimeOnly(it.breakEndAt)}</td>
                  <td>{formatTimeOnly(it.clockOutAt)}</td>
                  <td>
                    {it.workMinutes > 0
                      ? `${Math.floor(it.workMinutes / 60)}\u6642\u9593${it.workMinutes % 60}\u5206`
                      : "-"}
                  </td>
                  <td>
                    <Link href={`/corrections/new?date=${it.dateYmd}`}>\u4fee\u6b63\u7533\u8acb</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card layout */}
      <div className={styles.mobileCards}>
        {items.map((it) => (
          <div key={it.dateYmd} className={styles.mobileCard}>
            <div className={styles.mobileCardDate}>
              <span>{it.dateLabel}</span>
              <Link href={`/corrections/new?date=${it.dateYmd}`}>\u4fee\u6b63\u7533\u8acb</Link>
            </div>
            <div className={styles.mobileCardGrid}>
              <span>\u51fa\u52e4: {formatTimeOnly(it.clockInAt)}</span>
              <span>\u9000\u52e4: {formatTimeOnly(it.clockOutAt)}</span>
              <span>\u4f11\u61a9: {formatTimeOnly(it.breakStartAt)} - {formatTimeOnly(it.breakEndAt)}</span>
              <span>
                \u52b4\u50cd: {it.workMinutes > 0
                  ? `${Math.floor(it.workMinutes / 60)}h${it.workMinutes % 60}m`
                  : "-"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
