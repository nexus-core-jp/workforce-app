"use client";

import { useState, useTransition } from "react";

interface FaceAuthToggleProps {
  enabled: boolean;
  registeredUsers: number;
  totalUsers: number;
}

export function FaceAuthToggle({
  enabled: initialEnabled,
  registeredUsers,
  totalUsers,
}: FaceAuthToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    const newValue = !enabled;

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/face-auth", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled: newValue }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? "設定の更新に失敗しました");
          return;
        }
        setEnabled(newValue);
      } catch {
        setError("設定の更新に失敗しました");
      }
    });
  };

  return (
    <section>
      <h2 style={{ marginBottom: 12 }}>顔認証設定</h2>
      <div
        style={{
          padding: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              出退勤時の顔認証
              <span
                className={`badge ${enabled ? "badge-open" : "badge-closed"}`}
                style={{ marginLeft: 8 }}
              >
                {enabled ? "有効" : "無効"}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
              有効にすると、出勤・退勤の打刻時にカメラによる顔認証が必要になります。
            </p>
          </div>
          <button
            data-variant={enabled ? "danger" : "primary"}
            disabled={isPending}
            onClick={toggle}
          >
            {isPending ? "更新中..." : enabled ? "無効にする" : "有効にする"}
          </button>
        </div>

        {enabled && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: registeredUsers < totalUsers ? "var(--color-warning-bg, #fff3e0)" : "var(--color-success-bg, #e8f5e9)",
              border: `1px solid ${registeredUsers < totalUsers ? "var(--color-warning)" : "var(--color-success)"}`,
              borderRadius: "var(--radius)",
              fontSize: 13,
            }}
          >
            顔登録済み: {registeredUsers} / {totalUsers} 名
            {registeredUsers < totalUsers && (
              <span style={{ marginLeft: 8 }}>
                — 未登録のメンバーは出退勤打刻ができません
              </span>
            )}
          </div>
        )}

        {error && (
          <p className="error-text" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
