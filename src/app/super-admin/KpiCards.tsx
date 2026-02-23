interface KpiCardsProps {
  tenantCount: number;
  totalUsers: number;
  todayActive: number;
  trialExpiringSoon: number;
}

export function KpiCards({ tenantCount, totalUsers, todayActive, trialExpiringSoon }: KpiCardsProps) {
  const cards = [
    { label: "導入企業数", value: `${tenantCount} 社` },
    { label: "総ユーザー数", value: `${totalUsers} 名` },
    { label: "本日アクティブ", value: `${todayActive} 名` },
    { label: "トライアル期限7日以内", value: `${trialExpiringSoon} 社`, warn: trialExpiringSoon > 0 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            padding: 16,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.warn ? "var(--color-warning)" : undefined }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
