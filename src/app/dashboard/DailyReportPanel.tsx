import Link from "next/link";

export function DailyReportPanel(props: {
  dateYmd: string;
  status: "none" | "draft" | "submitted";
}) {
  const statusLabel =
    props.status === "submitted"
      ? "提出済み"
      : props.status === "draft"
        ? "下書き"
        : "未作成";

  const badgeClass =
    props.status === "submitted"
      ? "badge-approved"
      : props.status === "draft"
        ? "badge-pending"
        : "badge-rejected";

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>日報</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className={`badge ${badgeClass}`}>{statusLabel}</span>
        <Link
          href={`/daily-reports/new?date=${props.dateYmd}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            borderRadius: "var(--radius)",
            background: props.status === "none" ? "var(--color-primary)" : "var(--color-surface)",
            color: props.status === "none" ? "#fff" : "var(--color-primary)",
            border: `1px solid ${props.status === "none" ? "var(--color-primary)" : "var(--color-border)"}`,
            textDecoration: "none",
          }}
        >
          {props.status === "submitted"
            ? "日報を確認"
            : props.status === "draft"
              ? "日報を編集"
              : "日報を書く"}
        </Link>
      </div>
    </section>
  );
}
