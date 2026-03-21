import { EmptyState } from "@/components/EmptyState";

export function AdminDailyReports(props: {
  items: Array<{
    id: string;
    userLabel: string;
    dateLabel: string;
    route: string | null;
    cases: number | null;
    submittedAt: string | null;
  }>;
}) {
  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>提出済み日報</h2>
      {props.items.length === 0 ? (
        <EmptyState
          icon="📋"
          title="提出された日報はありません"
          description="メンバーが日報を提出するとここに表示されます"
        />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">日付</th>
                <th scope="col">社員</th>
                <th scope="col">ルート</th>
                <th scope="col">件数</th>
                <th scope="col">提出日時</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{r.dateLabel}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.userLabel}</td>
                  <td>{r.route ?? "—"}</td>
                  <td>{r.cases ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.submittedAt ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
