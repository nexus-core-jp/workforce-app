interface LeaveBalanceItem {
  name: string;
  granted: number;
  used: number;
  balance: number;
  consumptionRate: number;
}

export function LeaveBalanceReport({ items }: { items: LeaveBalanceItem[] }) {
  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>有休消化率</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
        年間5日以上の取得が義務付けられています（労働基準法）
      </p>

      {items.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>データがありません。</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>付与</th>
                <th>使用</th>
                <th>残日数</th>
                <th>消化率</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>{item.granted} 日</td>
                  <td>{item.used} 日</td>
                  <td style={{ fontWeight: 600, color: item.balance <= 2 ? "var(--color-danger)" : undefined }}>
                    {item.balance} 日
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "var(--color-border)", borderRadius: 3, minWidth: 60 }}>
                        <div
                          style={{
                            width: `${Math.min(100, item.consumptionRate)}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: item.consumptionRate >= 50
                              ? "var(--color-success)"
                              : item.consumptionRate >= 25
                                ? "var(--color-warning)"
                                : "var(--color-danger)",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, minWidth: 36 }}>{item.consumptionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
