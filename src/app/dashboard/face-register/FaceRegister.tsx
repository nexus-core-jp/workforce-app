"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Descriptor {
  id: string;
  label: string | null;
  createdAt: string;
}

export function FaceRegister() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [descriptors, setDescriptors] = useState<Descriptor[]>([]);
  const [faceapi, setFaceapi] = useState<typeof import("face-api.js") | null>(null);

  // Load face-api.js dynamically
  useEffect(() => {
    import("face-api.js").then(async (fa) => {
      setFaceapi(fa);
      const MODEL_URL = "/models/face-api";
      await Promise.all([
        fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    }).catch(() => {
      setError("顔認証モデルの読み込みに失敗しました");
    });
  }, []);

  // Load existing descriptors
  useEffect(() => {
    fetch("/api/face-auth/register")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setDescriptors(d.descriptors); });
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch {
      setError("カメラの起動に失敗しました。カメラへのアクセスを許可してください。");
    }
  }, []);

  // Capture face and register
  const captureAndRegister = async () => {
    if (!videoRef.current || !faceapi || !modelsLoaded) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("顔を検出できませんでした。カメラに正面を向けてもう一度お試しください。");
        setSaving(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      const res = await fetch("/api/face-auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");

      setSuccess("顔データを登録しました");
      // Refresh list
      const listRes = await fetch("/api/face-auth/register");
      const listData = await listRes.json();
      if (listData.ok) setDescriptors(listData.descriptors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/face-auth/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setDescriptors((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
        カメラで顔を撮影して登録します。登録後はキオスク端末（タブレット）で顔をかざすだけで出退勤が打刻されます。
      </p>

      {/* Camera section */}
      <div style={{ marginBottom: 16 }}>
        {!cameraReady ? (
          <button type="button" onClick={startCamera} disabled={!modelsLoaded} data-variant="primary">
            {modelsLoaded ? "カメラを起動" : "モデル読み込み中..."}
          </button>
        ) : (
          <div>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ borderRadius: 8, maxWidth: "100%", width: 480 }}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            <div>
              <button
                type="button"
                onClick={captureAndRegister}
                disabled={saving}
                data-variant="primary"
              >
                {saving ? "認識中..." : "この顔を登録"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: "var(--color-danger)", marginBottom: 8 }}>{error}</p>}
      {success && <p style={{ color: "var(--color-success)", marginBottom: 8 }}>{success}</p>}

      {/* Registered faces */}
      <h3 style={{ marginBottom: 8, marginTop: 16 }}>登録済みの顔データ</h3>
      {descriptors.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          まだ顔データが登録されていません。
        </p>
      ) : (
        <table style={{ fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-surface)" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid var(--color-border)" }}>#</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid var(--color-border)" }}>登録日時</th>
              <th style={{ padding: "8px 12px", borderBottom: "2px solid var(--color-border)" }}></th>
            </tr>
          </thead>
          <tbody>
            {descriptors.map((d, i) => (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "6px 12px" }}>{i + 1}</td>
                <td style={{ padding: "6px 12px" }}>
                  {new Intl.DateTimeFormat("ja-JP", {
                    timeZone: "Asia/Tokyo",
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  }).format(new Date(d.createdAt))}
                </td>
                <td style={{ padding: "6px 12px", textAlign: "right" }}>
                  <button type="button" onClick={() => handleDelete(d.id)}
                    style={{ fontSize: 12, padding: "2px 8px" }}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>
        精度を上げるには、正面・少し左・少し右の3パターンを登録することを推奨します（最大5件）。
      </p>
    </div>
  );
}
