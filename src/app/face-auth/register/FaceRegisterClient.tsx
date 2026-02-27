"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { FaceCamera } from "@/components/FaceCamera";

interface DescriptorInfo {
  id: string;
  createdAt: string;
}

interface FaceRegisterClientProps {
  initialCount: number;
  initialDescriptors: DescriptorInfo[];
  maxDescriptors: number;
}

export function FaceRegisterClient({
  initialCount,
  initialDescriptors,
  maxDescriptors,
}: FaceRegisterClientProps) {
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [descriptors, setDescriptors] = useState<DescriptorInfo[]>(initialDescriptors);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDescriptor = useCallback(
    async (descriptor: number[]) => {
      setError(null);
      try {
        const res = await fetch("/api/face-auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ descriptor }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? "登録に失敗しました");
          return;
        }
        setCount(data.count);
        setDescriptors((prev) => [
          ...prev,
          { id: data.id, createdAt: new Date().toISOString() },
        ]);
        setShowCamera(false);
      } catch {
        setError("登録に失敗しました");
      }
    },
    [],
  );

  const handleDelete = useCallback(async (id: string) => {
    setError(null);
    setDeleting(id);
    try {
      const res = await fetch("/api/face-auth/register", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "削除に失敗しました");
        return;
      }
      setDescriptors((prev) => prev.filter((d) => d.id !== id));
      setCount((prev) => prev - 1);
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  }, []);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div>
      {/* Registration status */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>登録状況</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          登録済み: <strong>{count}</strong> / {maxDescriptors} 件
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          複数回登録すると認証精度が向上します。異なる角度・照明条件で撮影することを推奨します。
        </p>
      </section>

      {/* Existing descriptors */}
      {descriptors.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8, fontSize: 15 }}>登録済み顔データ</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {descriptors.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                }}
              >
                <span>
                  登録 #{i + 1} — {formatDate(d.createdAt)}
                </span>
                <button
                  className="btn-compact"
                  data-variant="danger"
                  disabled={deleting === d.id}
                  onClick={() => handleDelete(d.id)}
                >
                  {deleting === d.id ? "削除中..." : "削除"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <p className="error-text" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}

      {/* Camera / register button */}
      {showCamera ? (
        <FaceCamera
          onDescriptor={handleDescriptor}
          onCancel={() => setShowCamera(false)}
          captureLabel="この顔を登録"
        />
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            data-variant="primary"
            disabled={count >= maxDescriptors}
            onClick={() => setShowCamera(true)}
          >
            {count === 0 ? "顔を登録する" : "追加登録する"}
          </button>
          <button onClick={() => router.push("/dashboard")}>ダッシュボードに戻る</button>
        </div>
      )}
    </div>
  );
}
