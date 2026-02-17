"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DailyReportForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [route, setRoute] = useState("");
  const [cases, setCases] = useState("");
  const [workHoursText, setWorkHoursText] = useState("");
  const [incidentsText, setIncidentsText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [announcementsText, setAnnouncementsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = (submit: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/daily-reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            date,
            route: route || undefined,
            cases: cases ? parseInt(cases, 10) : undefined,
            workHoursText: workHoursText || undefined,
            incidentsText: incidentsText || undefined,
            notesText: notesText || undefined,
            announcementsText: announcementsText || undefined,
            submit,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        router.push("/daily-reports");
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520, marginTop: 16 }}>
      <label style={{ display: "grid", gap: 4 }}>
        日付
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        ルート
        <input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="例: A地区→B地区" />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        対応件数
        <input type="number" min={0} value={cases} onChange={(e) => setCases(e.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        稼働時間
        <input value={workHoursText} onChange={(e) => setWorkHoursText(e.target.value)} placeholder="例: 9:00-18:00 (8h)" />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        インシデント・事故
        <textarea rows={3} value={incidentsText} onChange={(e) => setIncidentsText(e.target.value)} style={{ width: "100%" }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        備考・メモ
        <textarea rows={3} value={notesText} onChange={(e) => setNotesText(e.target.value)} style={{ width: "100%" }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        連絡事項
        <textarea rows={3} value={announcementsText} onChange={(e) => setAnnouncementsText(e.target.value)} style={{ width: "100%" }} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={isPending || !date} onClick={() => save(false)}>
          {isPending ? "保存中…" : "下書き保存"}
        </button>
        <button disabled={isPending || !date} onClick={() => save(true)}>
          {isPending ? "提出中…" : "提出する"}
        </button>
      </div>
      {error ? <p style={{ color: "var(--danger)" }}>エラー: {error}</p> : null}
    </div>
  );
}
