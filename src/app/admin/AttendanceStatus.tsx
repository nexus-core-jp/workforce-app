interface AttendanceStatusItem {
  name: string;
  status: "working" | "on_break" | "clocked_out" | "not_clocked_in" | "on_leave";
  clockInAt: string | null;
  clockOutAt: string | null;
}

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  working: { label: "勤務中", badge: "badge-approved" },
  on_break: { label: "休憩中", badge: "badge-pending" },
  clocked_out: { label: "退勤済", badge: "badge-closed" },
  not_clocked_in: { label: "未出勤", badge: "badge-rejected" },
  on_leave: { label: "休暇", badge: "badge-pending" },
};

export function AttendanceStatus({ items }: { items: AttendanceStatusItem[] }) {
  const working = items.filter((i) => i.status === "working" || i.status === "on_break").length;
  const done = items.filter((i) => i.status === "clocked_out").length;
  const notIn = items.filter((i) => i.status === "not_clocked_in").length;
  const onLeave = items.filter((i) => i.status === "on_leave").length;

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>本日の出勤状況</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <span className="badge badge-approved">{working} 名勤務中</span>
        </div>
        <div>
          <span className="badge badge-closed">{done} 名退勤済</span>
        </div>
        <div>
          <span className="badge badge-rejected">{notIn} 名未出勤</span>
        </div>
        {onLeave > 0 && (
          <div>
            <span className="badge badge-pending">{onLeave} 名休暇</span>
          </div>
        )}
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>状態</th>
              <th>出勤</th>
              <th>退勤</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const st = STATUS_MAP[item.status];
              return (
                <tr key={i}>
                  <td>{item.name}</td>
                  <td>
                    <span className={`badge ${st.badge}`}>{st.label}</span>
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
