import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";
import { startOfJstDay } from "@/lib/time";

import { DailyReportForm } from "./DailyReportForm";

function jstTodayYmd() {
  const today = startOfJstDay(new Date());
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
}

function parseJstDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const approx = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  return startOfJstDay(approx);
}

export default async function NewDailyReportPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) redirect("/login");

  const sp = await props.searchParams;
  const dateYmd = sp.date ?? jstTodayYmd();
  const date = parseJstDateOnly(dateYmd);

  // Load existing draft if any
  const existing = await prisma.dailyReport.findUnique({
    where: {
      tenantId_userId_date: {
        tenantId: user.tenantId,
        userId: user.id,
        date,
      },
    },
  });

  const initial = existing
    ? {
        route: existing.route ?? "",
        cases: existing.cases ?? 0,
        workHoursText: existing.workHoursText ?? "",
        incidentsText: existing.incidentsText ?? "",
        notesText: existing.notesText ?? "",
        announcementsText: existing.announcementsText ?? "",
        status: existing.status,
      }
    : null;

  return (
    <main className="page-container">
      <h1 style={{ marginBottom: 16 }}>日報</h1>

      <DailyReportForm date={dateYmd} initial={initial} />

      <div style={{ marginTop: 16 }}>
        <Link href="/dashboard">&larr; ダッシュボードに戻る</Link>
      </div>
    </main>
  );
}
