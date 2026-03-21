interface AttendanceStatusItem {
  name: string;
  status: "working" | "on_break" | "clocked_out" | "not_clocked_in" | "on_leave";
  clockInAt: string | null;
  clockOutAt: string | null;
}

const STATUS_MAP: Record<string, { label: string; badge: string; srLabel: string }> = {
  working: { label: "勤務中", badge: "badge-approved", srLabel: "現在勤務中" },
  on_break: { label: "休憩中", badge: "badge-pending", srLabel: "現在休憩中" },
  clocked_out: { label: "退勤済", badge: "badge-closed", srLabel: "退勤済み" },
  not_clocked_in: { label: "未出勤", badge: "badge-rejected", srLabel: "まだ出勤していません" },
  on_leave: { label: "休暇", badge: "badge-pending", srLabel: "本日休暇" },
};

export function AttendanceStatus({ items }: { items: AttendanceStatusItem[] }) {
  const working = items.filter((i) => i.status === "working" || i.status === "on_break").length;
  const done = items.filter((i) => i.status === "clocked_out").length;
  const notIn = items.filter((i) => i.status === "not_clocked_in").length;
  const onLeave = items.filter((i) => i.status === "on_leave").length;

  return (
    <section aria-label="本日の出勤状況">
      <h2 style={{ marginBottom: 12 }}>本日の出勤状況</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="badge badge-approved" aria-label={`${working}名が勤務中`}>{working} 名勤務中</span>
        <span className="badge badge-closed" aria-label={`${done}名が退勤済み`}>{done} 名退勤済</span>
        <span className="badge badge-rejected" aria-label={`${notIn}名が未出勤`}>{notIn} 名未出勤</span>
        {onLeave > 0 && (
          <span className="badge badge-pending" aria-label={`${onLeave}名が休暇中`}>{onLeave} 名休暇</span>
        )}
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">名前</th>
              <th scope="col">状態</th>
              <th scope="col">出勤</th>
              <th scope="col">退勤</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const st = STATUS_MAP[item.status];
              return (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>
                    <span className={`badge ${st.badge}`} aria-label={st.srLabel}>{st.label}</span>
                  </td>
                  <td>{item.clockInAt ?? "-"}</td>
                  <td>{item.clockOutAt ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
