import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatLocal } from "@/lib/time";

import { LeaveRequestForm } from "./LeaveRequestForm";
import { LeaveDecideButtons } from "./LeaveDecideButtons";

export default async function LeavePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { id: userId, tenantId, role } = session.user;
  const isAdmin = role === "ADMIN";

  const requests = await prisma.leaveRequest.findMany({
    where: isAdmin ? { tenantId } : { tenantId, userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>休暇申請</h1>

      <LeaveRequestForm />

      <section style={{ marginTop: 24 }}>
        <h2>{isAdmin ? "全申請一覧" : "あなたの申請一覧"}</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>申請者</th>
                <th>種別</th>
                <th>開始</th>
                <th>終了</th>
                <th>理由</th>
                <th>状態</th>
                {isAdmin && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.user.name ?? r.user.email}</td>
                  <td>{r.type}</td>
                  <td>{formatLocal(r.startAt)}</td>
                  <td>{formatLocal(r.endAt)}</td>
                  <td>{r.reason ?? "-"}</td>
                  <td>{r.status}</td>
                  {isAdmin && (
                    <td>
                      {r.status === "PENDING" && r.userId !== userId ? (
                        <LeaveDecideButtons id={r.id} />
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: "center", opacity: 0.6 }}>
                    申請なし
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav style={{ marginTop: 24 }}>
        <Link href="/dashboard">← ダッシュボード</Link>
      </nav>
    </main>
  );
}
