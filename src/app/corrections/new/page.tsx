import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TIMEZONE } from "@/lib/constants";
import { startOfJstDay } from "@/lib/time";
import { Breadcrumb } from "@/components/NavLink";

import { CorrectionForm } from "./CorrectionForm";

function jstTodayYmd() {
  const today = startOfJstDay(new Date());
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
}

export default async function NewCorrectionPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await props.searchParams;
  const date = sp.date ?? jstTodayYmd();

  return (
    <main className="page-container">
      <Breadcrumb
        items={[
          { label: "ダッシュボード", href: "/dashboard" },
          { label: "打刻修正申請" },
        ]}
      />

      <h1 style={{ marginBottom: 16 }}>打刻修正申請（新規）</h1>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 8 }}>
        希望時刻と理由を入力して申請してください。
      </p>

      <CorrectionForm date={date} />
    </main>
  );
}
