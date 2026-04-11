"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tenantName: string;
  tenantSlug: string;
  initialProgress: {
    hasDepartments: boolean;
    hasMembers: boolean;
    hasShifts: boolean;
    hasHolidays: boolean;
  };
}

type StepId = "welcome" | "departments" | "shifts" | "members" | "holidays" | "done";

const STEPS: Array<{ id: StepId; title: string; optional: boolean }> = [
  { id: "welcome", title: "ようこそ", optional: false },
  { id: "departments", title: "部門を作成", optional: true },
  { id: "shifts", title: "シフトパターン", optional: true },
  { id: "members", title: "従業員を追加", optional: true },
  { id: "holidays", title: "会社休業日", optional: true },
  { id: "done", title: "完了", optional: false },
];

export function OnboardingWizard({ tenantName, tenantSlug, initialProgress }: Props) {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIdx];
  const progress = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  const complete = async () => {
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "完了処理に失敗しました");
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setCompleting(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>初期設定</h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Workforce Nexus へようこそ。数分で初期設定を終えましょう。
      </p>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          background: "var(--color-border)",
          borderRadius: 3,
          marginBottom: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--color-primary, #2563eb)",
            transition: "width 0.3s",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Step {stepIdx + 1} / {STEPS.length}: {step.title}
      </div>

      <section
        style={{
          padding: 24,
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          background: "var(--color-surface)",
          marginBottom: 16,
        }}
      >
        {step.id === "welcome" && (
          <>
            <h2 style={{ marginTop: 0 }}>ようこそ、{tenantName} さん</h2>
            <p>会社ID: <code>{tenantSlug}</code></p>
            <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              この画面では、以下の初期設定を行います:
            </p>
            <ul style={{ lineHeight: 1.8 }}>
              <li>部門の作成(任意)</li>
              <li>シフトパターンの登録(任意)</li>
              <li>従業員の招待(任意)</li>
              <li>会社休業日の登録(任意)</li>
            </ul>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              全てのステップは後からでも設定できます。スキップしても問題ありません。
            </p>
          </>
        )}

        {step.id === "departments" && (
          <>
            <h2 style={{ marginTop: 0 }}>部門を作成</h2>
            <p>営業部、開発部など組織の部門を作成します。シフトや勤怠レポートで部門別集計に使います。</p>
            {initialProgress.hasDepartments ? (
              <p style={{ color: "var(--color-success)" }}>✓ 既に部門が作成されています</p>
            ) : (
              <a
                href="/admin/departments"
                target="_blank"
                rel="noopener"
                style={{ display: "inline-block", padding: "10px 16px", background: "var(--color-primary, #2563eb)", color: "white", borderRadius: 6, textDecoration: "none" }}
              >
                部門管理を開く(別タブ)
              </a>
            )}
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 12 }}>
              ※ 作成後、このタブに戻って「次へ」を押してください
            </p>
          </>
        )}

        {step.id === "shifts" && (
          <>
            <h2 style={{ marginTop: 0 }}>シフトパターン</h2>
            <p>標準的な勤務時間(例: 9:00-18:00, 休憩60分)を登録します。</p>
            {initialProgress.hasShifts ? (
              <p style={{ color: "var(--color-success)" }}>✓ 既にシフトパターンが登録されています</p>
            ) : (
              <a
                href="/admin/shifts"
                target="_blank"
                rel="noopener"
                style={{ display: "inline-block", padding: "10px 16px", background: "var(--color-primary, #2563eb)", color: "white", borderRadius: 6, textDecoration: "none" }}
              >
                シフト管理を開く(別タブ)
              </a>
            )}
          </>
        )}

        {step.id === "members" && (
          <>
            <h2 style={{ marginTop: 0 }}>従業員を追加</h2>
            <p>従業員を招待してログインできるようにします。入社日を設定すると年次有給が自動付与されます。</p>
            {initialProgress.hasMembers ? (
              <p style={{ color: "var(--color-success)" }}>✓ 既に従業員が登録されています</p>
            ) : (
              <a
                href="/admin/members"
                target="_blank"
                rel="noopener"
                style={{ display: "inline-block", padding: "10px 16px", background: "var(--color-primary, #2563eb)", color: "white", borderRadius: 6, textDecoration: "none" }}
              >
                メンバー管理を開く(別タブ)
              </a>
            )}
          </>
        )}

        {step.id === "holidays" && (
          <>
            <h2 style={{ marginTop: 0 }}>会社休業日</h2>
            <p>夏季休業、年末年始など自社独自の休日を登録します。日本の祝日は自動で反映されます。</p>
            {initialProgress.hasHolidays ? (
              <p style={{ color: "var(--color-success)" }}>✓ 既に登録されています</p>
            ) : (
              <a
                href="/admin/holidays"
                target="_blank"
                rel="noopener"
                style={{ display: "inline-block", padding: "10px 16px", background: "var(--color-primary, #2563eb)", color: "white", borderRadius: 6, textDecoration: "none" }}
              >
                休日カレンダーを開く(別タブ)
              </a>
            )}
          </>
        )}

        {step.id === "done" && (
          <>
            <h2 style={{ marginTop: 0 }}>初期設定完了</h2>
            <p>これでβ版の基本機能を利用できます。</p>
            <ul>
              <li>従業員にログインURLを共有してください: <code>https://your-domain/login</code></li>
              <li>会社ID: <code>{tenantSlug}</code></li>
              <li>2段階認証(2FA)の有効化を推奨します(設定ページから)</li>
              <li>給与設定は「給与設定」メニューから個別に行えます</li>
            </ul>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
              このウィザードは初回のみ表示されます。再表示は不要になります。
            </p>
          </>
        )}
      </section>

      {error && <p style={{ color: "var(--color-danger)", marginBottom: 12 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          style={{ visibility: stepIdx === 0 ? "hidden" : "visible" }}
        >
          ← 戻る
        </button>
        {stepIdx < STEPS.length - 1 ? (
          <button type="button" data-variant="primary" onClick={() => setStepIdx((i) => i + 1)}>
            {step.optional ? "スキップ" : "次へ"} →
          </button>
        ) : (
          <button type="button" data-variant="primary" onClick={complete} disabled={completing}>
            {completing ? "保存中..." : "管理画面へ"}
          </button>
        )}
      </div>
    </main>
  );
}
