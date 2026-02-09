import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TIMEZONE } from "@/lib/constants";
import { startOfJstDay } from "@/lib/time";

import { CorrectionForm } from "./CorrectionForm";
import styles from "./corrections.module.css";

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
    <main className={styles.page}>
      <Link href="/dashboard" className={styles.backLink}>
        &larr; \u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9\u306b\u623b\u308b
      </Link>

      <h1 className={styles.title}>\u6253\u523b\u4fee\u6b63\u7533\u8acb</h1>

      <div className={styles.card}>
        <div className={styles.dateBadge}>\u5bfe\u8c61\u65e5: {date}</div>
        <CorrectionForm date={date} />
      </div>
    </main>
  );
}
