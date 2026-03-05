"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FaceAuthToggle({ enabled, kioskUrl, registeredUsers, totalUsers, available }: { enabled: boolean; kioskUrl: string; registeredUsers: number; totalUsers: number; available: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(enabled);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/face-auth", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !isEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      setIsEnabled(data.faceAuthEnabled);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 style={{ marginBottom: 8 }}>顔認証（オプション）</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
        有効にすると、従業員が顔データを登録でき、キオスク端末（タブレット）で顔をかざすだけで出退勤を打刻できます。
      </p>

      {!available && (
        <div style={{
          padding: "8px 12px",
          marginBottom: 12,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--color-text-secondary)",
          opacity: 0.8,
        }}>
          この機能を利用するには、環境変数 <code>NEXT_PUBLIC_FACE_AUTH_AVAILABLE=true</code> の設定と顔認証モデルのセットアップが必要です。
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading || !available}
          data-variant={isEnabled ? undefined : "primary"}
          style={{ padding: "6px 16px", opacity: available ? 1 : 0.5 }}
        >
          {loading ? "更新中..." : isEnabled ? "無効にする" : "有効にする"}
        </button>
        <span className={`badge ${isEnabled && available ? "badge-approved" : "badge-rejected"}`}>
          {!available ? "未設定" : isEnabled ? "有効" : "無効"}
        </span>
      </div>

      {isEnabled && available && (
        <div style={{
          padding: 12,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          fontSize: 13,
        }}>
          <div style={{ marginBottom: 8 }}>
            <strong>顔データ登録状況:</strong>{" "}
            <span>{registeredUsers} / {totalUsers} 名が登録済み</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>キオスク端末URL:</strong>{" "}
            <code style={{ background: "var(--color-bg)", padding: "2px 6px", borderRadius: 4 }}>
              {typeof window !== "undefined" ? window.location.origin : ""}{kioskUrl}
            </code>
          </div>
          <p style={{ color: "var(--color-text-secondary)" }}>
            このURLをタブレットのブラウザで開くと、ログイン不要の顔認証打刻端末として動作します。
            従業員は各自のダッシュボードから顔データを登録できます。
          </p>
        </div>
      )}

      {error && <p style={{ color: "var(--color-danger)", marginTop: 8 }}>{error}</p>}
    </section>
  );
}
