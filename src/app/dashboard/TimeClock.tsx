"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { FaceCamera } from "@/components/FaceCamera";

type PunchAction = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";

async function punch(
  action: PunchAction,
  faceDescriptor?: number[],
) {
  const body: Record<string, unknown> = { action };
  if (faceDescriptor) body.faceDescriptor = faceDescriptor;

  const res = await fetch("/api/time-entry/punch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

/** Whether the given action requires face verification. */
function requiresFace(action: PunchAction): boolean {
  return action === "CLOCK_IN" || action === "CLOCK_OUT";
}

export function TimeClock(props: {
  canClockIn: boolean;
  canBreakStart: boolean;
  canBreakEnd: boolean;
  canClockOut: boolean;
  /** If true, CLOCK_IN / CLOCK_OUT require face verification. */
  faceAuthEnabled?: boolean;
  /** If true, the user has at least one registered face descriptor. */
  faceRegistered?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When face auth is needed, we show the camera and remember which action
  // triggered it.
  const [pendingAction, setPendingAction] = useState<PunchAction | null>(null);

  const executePunch = useCallback(
    async (action: PunchAction, faceDescriptor?: number[]) => {
      setError(null);
      setLoading(true);
      try {
        await punch(action, faceDescriptor);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "打刻に失敗しました");
      } finally {
        setLoading(false);
        setPendingAction(null);
      }
    },
    [router],
  );

  const handleClick = useCallback(
    (action: PunchAction) => {
      if (props.faceAuthEnabled && requiresFace(action)) {
        if (!props.faceRegistered) {
          setError("顔が未登録です。先に顔登録を行ってください。");
          return;
        }
        // Show camera for face verification
        setPendingAction(action);
      } else {
        executePunch(action);
      }
    },
    [props.faceAuthEnabled, props.faceRegistered, executePunch],
  );

  const handleFaceDescriptor = useCallback(
    (descriptor: number[]) => {
      if (!pendingAction) return;
      executePunch(pendingAction, descriptor);
    },
    [pendingAction, executePunch],
  );

  // Show camera overlay when face verification is pending
  if (pendingAction) {
    return (
      <section>
        <h2 style={{ marginBottom: 12 }}>
          顔認証 — {pendingAction === "CLOCK_IN" ? "出勤" : "退勤"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
          カメラに顔を映して撮影ボタンを押してください。
        </p>
        {loading ? (
          <p style={{ textAlign: "center", padding: 24 }}>認証中...</p>
        ) : (
          <FaceCamera
            onDescriptor={handleFaceDescriptor}
            onCancel={() => setPendingAction(null)}
            captureLabel="認証して打刻"
          />
        )}
        {error && <p className="error-text" style={{ marginTop: 8 }}>エラー: {error}</p>}
      </section>
    );
  }

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>打刻</h2>

      {/* Face auth banner */}
      {props.faceAuthEnabled && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            background: props.faceRegistered ? "var(--color-success-bg, #e8f5e9)" : "var(--color-warning-bg, #fff3e0)",
            border: `1px solid ${props.faceRegistered ? "var(--color-success)" : "var(--color-warning)"}`,
            borderRadius: "var(--radius)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            {props.faceRegistered
              ? "顔認証が有効です（出勤・退勤時に顔認証が必要です）"
              : "顔認証が有効ですが、顔が未登録です"}
          </span>
          <Link href="/face-auth/register" style={{ fontSize: 13 }}>
            {props.faceRegistered ? "顔登録を管理" : "顔を登録する →"}
          </Link>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          data-variant="primary"
          disabled={!props.canClockIn || loading}
          onClick={() => handleClick("CLOCK_IN")}
        >
          {loading ? "処理中..." : "出勤"}
        </button>
        <button
          disabled={!props.canBreakStart || loading}
          onClick={() => handleClick("BREAK_START")}
        >
          休憩開始
        </button>
        <button
          disabled={!props.canBreakEnd || loading}
          onClick={() => handleClick("BREAK_END")}
        >
          休憩終了
        </button>
        <button
          data-variant="danger"
          disabled={!props.canClockOut || loading}
          onClick={() => handleClick("CLOCK_OUT")}
        >
          退勤
        </button>
      </div>
      {error && <p className="error-text">エラー: {error}</p>}
    </section>
  );
}
