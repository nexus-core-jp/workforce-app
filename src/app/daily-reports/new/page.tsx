import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { DailyReportForm } from "./DailyReportForm";

export default async function NewDailyReportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>日報作成</h1>
      <DailyReportForm defaultDate={today} />
      <nav style={{ marginTop: 24 }}>
        <Link href="/daily-reports">← 日報一覧</Link>
      </nav>
    </main>
  );
}
