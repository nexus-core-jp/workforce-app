import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { formatLocal, startOfJstDay } from "@/lib/time";

import { TimeClock } from "./TimeClock";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;

  const tenantId: string = user.tenantId;
  const userId: string = user.id;

  const today = startOfJstDay(new Date());
  const entry = await prisma.timeEntry.findUnique({
    where: { tenantId_userId_date: { tenantId, userId, date: today } },
  });

  const clockInAt = entry?.clockInAt ?? null;
  const breakStartAt = entry?.breakStartAt ?? null;
  const breakEndAt = entry?.breakEndAt ?? null;
  const clockOutAt = entry?.clockOutAt ?? null;

  const canClockIn = !clockInAt;
  const canBreakStart = !!clockInAt && !clockOutAt && !breakStartAt;
  const canBreakEnd = !!breakStartAt && !breakEndAt;
  const canClockOut = !!clockInAt && !clockOutAt && (!breakStartAt || !!breakEndAt);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>Dashboard</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        tenant: <b>{user.tenantId}</b> / role: <b>{user.role}</b>
      </p>

      <div style={{ marginTop: 16 }}>
        <p>
          ログイン中: <b>{user.name ?? user.email}</b>
        </p>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 8 }}>今日の打刻</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>出勤: {formatLocal(clockInAt)}</li>
          <li>休憩開始: {formatLocal(breakStartAt)}</li>
          <li>休憩終了: {formatLocal(breakEndAt)}</li>
          <li>退勤: {formatLocal(clockOutAt)}</li>
          <li>労働分（概算）: {entry?.workMinutes ?? 0} 分</li>
        </ul>
      </section>

      <TimeClock
        canClockIn={canClockIn}
        canBreakStart={canBreakStart}
        canBreakEnd={canBreakEnd}
        canClockOut={canClockOut}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Link href="/">/ (root)</Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit">ログアウト</button>
        </form>
      </div>

      <hr style={{ margin: "24px 0" }} />
      <p>次: 打刻履歴 / 修正申請 / 日報あたりを足していく。</p>
    </main>
  );
}
