import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { getJapaneseHolidays } from "@/lib/holidays";

import { Logo } from "../../Logo";
import { HolidayManager } from "./HolidayManager";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const { tenantId } = user;

  // Current JST year
  const now = new Date();
  const jstYear = new Date(now.getTime() + JST_OFFSET_MS).getUTCFullYear();

  // Get tenant custom holidays for this year
  const tenantHolidays = await prisma.tenantHoliday.findMany({
    where: {
      tenantId,
      date: {
        gte: new Date(Date.UTC(jstYear, 0, 1) - JST_OFFSET_MS),
        lt: new Date(Date.UTC(jstYear + 1, 0, 1) - JST_OFFSET_MS),
      },
    },
    orderBy: { date: "asc" },
  });

  const customHolidayItems = tenantHolidays.map((h) => ({
    id: h.id,
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(h.date),
    name: h.name,
    recurring: h.recurring,
  }));

  // Get national holidays for reference
  const nationalHolidays = getJapaneseHolidays(jstYear);
  const nationalList = [...nationalHolidays].sort();

  return (
    <>
      <header className="app-header">
        <h1><Logo /></h1>
        <div className="user-info">
          <span>{user.name ?? user.email}</span>
          <span className="badge badge-closed">管理者</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-compact">ログアウト</button>
          </form>
        </div>
      </header>

      <main className="page-container">
        <nav style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <Link href="/admin">← 管理画面</Link>
          <Link href="/admin/payroll/calc">給与計算</Link>
        </nav>

        <h2 style={{ marginBottom: 8 }}>休日カレンダー ({jstYear}年)</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          会社独自の休業日を管理します。登録した日付は給与計算の所定労働日から除外され、出勤した場合は休日手当が適用されます。
        </p>

        {/* Company custom holidays */}
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 12 }}>会社休業日</h3>
          <HolidayManager holidays={customHolidayItems} year={jstYear} />
        </section>

        {/* National holidays reference */}
        <section>
          <h3 style={{ marginBottom: 12 }}>国民の祝日 ({jstYear}年) — 自動適用済み</h3>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            以下の祝日は自動的に休日として給与計算に反映されます（登録不要）。
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 4,
            fontSize: 13,
          }}>
            {nationalList.map((dateStr) => {
              const [, m, d] = dateStr.split("-");
              return (
                <div key={dateStr} style={{ padding: "4px 0" }}>
                  <span style={{ color: "var(--color-error, #c00)", fontWeight: 600 }}>
                    {parseInt(m)}/{parseInt(d)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
