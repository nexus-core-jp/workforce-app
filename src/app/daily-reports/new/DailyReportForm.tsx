"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InitialData {
  route: string;
  cases: number;
  workHoursText: string;
  incidentsText: string;
  notesText: string;
  announcementsText: string;
  status: string;
}

export function DailyReportForm({
  date,
  initial,
}: {
  date: string;
  initial: InitialData | null;
}) {
  const router = useRouter();
  const [route, setRoute] = useState(initial?.route ?? "");
  const [cases, setCases] = useState(initial?.cases ?? 0);
  const [workHoursText, setWorkHoursText] = useState(initial?.workHoursText ?? "");
  const [incidentsText, setIncidentsText] = useState(initial?.incidentsText ?? "");
  const [notesText, setNotesText] = useState(initial?.notesText ?? "");
  const [announcementsText, setAnnouncementsText] = useState(initial?.announcementsText ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isSubmitted = initial?.status === "SUBMITTED";

  const save = async (submit: boolean) => {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/daily-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          route: route || null,
          cases: cases || null,
          workHoursText: workHoursText || null,
          incidentsText: incidentsText || null,
          notesText: notesText || null,
          announcementsText: announcementsText || null,
          submit,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      if (submit) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setSaved(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>
          {date}
        </h2>
        {isSubmitted && (
          <span className="badge badge-approved">提出済み</span>
        )}
        {initial && !isSubmitted && (
          <span className="badge badge-pending">下書き</span>
        )}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>ルート / 訪問先</span>
          <input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="例: A社 → B社 → 帰社"
            disabled={isSubmitted}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>対応件数</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={cases}
              onChange={(e) => setCases(Number(e.target.value))}
              disabled={isSubmitted}
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>勤務時間</span>
            <input
              value={workHoursText}
              onChange={(e) => setWorkHoursText(e.target.value)}
              placeholder="例: 9:00-18:00"
              disabled={isSubmitted}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 4 }}>
          <span>インシデント・トラブル</span>
          <textarea
            rows={3}
            value={incidentsText}
            onChange={(e) => setIncidentsText(e.target.value)}
            placeholder="特になければ空欄でOK"
            disabled={isSubmitted}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>業務メモ・備考</span>
          <textarea
            rows={3}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="業務内容や気づきなど"
            disabled={isSubmitted}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>連絡事項</span>
          <textarea
            rows={2}
            value={announcementsText}
            onChange={(e) => setAnnouncementsText(e.target.value)}
            placeholder="チームへの共有事項など"
            disabled={isSubmitted}
          />
        </label>

        {!isSubmitted && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => save(false)}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "保存中..." : "下書き保存"}
            </button>
            <button
              data-variant="primary"
              onClick={() => save(true)}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "提出中..." : "提出する"}
            </button>
          </div>
        )}

        {saved && (
          <p style={{ color: "var(--color-success)", fontSize: 14 }}>
            下書きを保存しました
          </p>
        )}
        {error ? <p className="error-text">エラー: {error}</p> : null}
      </div>
    </section>
  );
}
