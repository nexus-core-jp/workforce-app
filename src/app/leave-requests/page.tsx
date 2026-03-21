import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { Breadcrumb } from "@/components/NavLink";
import { EmptyState } from "@/components/EmptyState";

const TYPE_LABELS: Record<string, string> = {
  PAID: "有給休暇",
  HALF: "半休",
  HOURLY: "時間休",
  ABSENCE: "欠勤",
};

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "承認待ち", badge: "badge-pending" },
  APPROVED: { label: "承認済み", badge: "badge-approved" },
  REJECTED: { label: "却下", badge: "badge-rejected" },
  NEEDS_ATTENTION: { label: "要確認", badge: "badge-pending" },
};

function formatDateJp(dt: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);
}

export default async function LeaveRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const { tenantId, id: userId } = user;

  const requests = await prisma.leaveRequest.findMany({
    where: { tenantId, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Leave balance
  const ledger = await prisma.leaveLedgerEntry.findMany({
    where: { tenantId, userId },
  });
  let balance = 0;
  for (const entry of ledger) {
    const days = Number(entry.days);
    if (entry.kind === "USE") {
      balance -= days;
    } else {
      balance += days;
    }
  }

  return (
    <main className="page-container">
      <Breadcrumb
        items={[
          { label: "ダッシュボード", href: "/dashboard" },
          { label: "休暇申請" },
        ]}
      />

      <h1 style={{ marginBottom: 16 }}>休暇申請</h1>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>有休残日数: </span>
            <span
              style={{ fontSize: 20, fontWeight: 700, color: balance <= 2 ? "var(--color-danger)" : "var(--color-success)" }}
              aria-label={`有給休暇残り${balance}日`}
            >
              {balance} 日
            </span>
          </div>
          <Link href="/leave-requests/new">
            <button data-variant="primary">新規申請</button>
          </Link>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>申請履歴</h2>
        {requests.length === 0 ? (
          <EmptyState
            icon="🏖️"
            title="まだ休暇申請はありません"
            description="休暇を取得するには新規申請を行ってください"
            actionLabel="新規申請"
            actionHref="/leave-requests/new"
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">種別</th>
                  <th scope="col">期間</th>
                  <th scope="col">理由</th>
                  <th scope="col">状態</th>
                  <th scope="col">申請日</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const st = STATUS_LABELS[r.status] ?? { label: r.status, badge: "" };
                  return (
                    <tr key={r.id}>
                      <td>{TYPE_LABELS[r.type] ?? r.type}</td>
                      <td>
                        {formatDateJp(r.startAt)}
                        {r.type !== "HALF" && ` 〜 ${formatDateJp(r.endAt)}`}
                      </td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.reason || "-"}
                      </td>
                      <td>
                        <span className={`badge ${st.badge}`}>{st.label}</span>
                      </td>
                      <td>{formatDateJp(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
