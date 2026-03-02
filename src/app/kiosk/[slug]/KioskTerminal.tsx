"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface StoredDescriptor {
  userId: string;
  userName: string;
  descriptor: number[];
}

type KioskState =
  | { phase: "loading" }
  | { phase: "ready" }
  | { phase: "detecting" }
  | { phase: "result"; userName: string; action: string; time: string; success: boolean; message?: string }
  | { phase: "error"; message: string };

export function KioskTerminal({ tenantSlug }: { tenantSlug: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<KioskState>({ phase: "loading" });
  const [action, setAction] = useState<"CLOCK_IN" | "CLOCK_OUT">("CLOCK_IN");
  const [descriptorsData, setDescriptorsData] = useState<StoredDescriptor[]>([]);
  const [faceapi, setFaceapi] = useState<typeof import("face-api.js") | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load face-api.js + models + descriptors + start camera
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fa = await import("face-api.js");
        if (cancelled) return;
        setFaceapi(fa);

        const MODEL_URL = "/models/face-api";
        await Promise.all([
          fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (cancelled) return;

        // Fetch tenant descriptors
        const res = await fetch(`/api/face-auth/descriptors?tenantSlug=${tenantSlug}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        setDescriptorsData(data.descriptors);

        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setState({ phase: "ready" });
      } catch (err) {
        if (!cancelled) {
          setState({ phase: "error", message: err instanceof Error ? err.message : "初期化に失敗しました" });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [tenantSlug]);

  // Euclidean distance for face matching
  const euclideanDistance = (a: number[], b: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  };

  // Detect face and match
  const handlePunch = useCallback(async () => {
    if (!videoRef.current || !faceapi || descriptorsData.length === 0) return;

    setState({ phase: "detecting" });

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setState({ phase: "result", userName: "", action: "", time: "", success: false, message: "顔を検出できませんでした" });
        setTimeout(() => setState({ phase: "ready" }), 3000);
        return;
      }

      // Find closest match
      const THRESHOLD = 0.5; // Lower = stricter
      let bestMatch: StoredDescriptor | null = null;
      let bestDistance = Infinity;

      for (const stored of descriptorsData) {
        const dist = euclideanDistance(stored.descriptor, detection.descriptor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = stored;
        }
      }

      if (!bestMatch || bestDistance > THRESHOLD) {
        setState({
          phase: "result",
          userName: "",
          action: "",
          time: "",
          success: false,
          message: `一致する顔データが見つかりませんでした (距離: ${bestDistance.toFixed(2)})`,
        });
        setTimeout(() => setState({ phase: "ready" }), 4000);
        return;
      }

      // Punch via API
      const punchRes = await fetch("/api/face-auth/kiosk-punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          userId: bestMatch.userId,
          action,
        }),
      });
      const punchData = await punchRes.json();

      if (punchData.ok) {
        setState({
          phase: "result",
          userName: bestMatch.userName,
          action: action === "CLOCK_IN" ? "出勤" : "退勤",
          time: new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(new Date(punchData.time)),
          success: true,
        });
      } else {
        setState({
          phase: "result",
          userName: bestMatch.userName,
          action: "",
          time: "",
          success: false,
          message: punchData.error ?? "打刻に失敗しました",
        });
      }

      setTimeout(() => setState({ phase: "ready" }), 4000);
    } catch (err) {
      setState({
        phase: "result",
        userName: "",
        action: "",
        time: "",
        success: false,
        message: err instanceof Error ? err.message : "エラーが発生しました",
      });
      setTimeout(() => setState({ phase: "ready" }), 4000);
    }
  }, [faceapi, descriptorsData, action, tenantSlug]);

  const timeStr = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(currentTime);

  const dateStr = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(currentTime);

  return (
    <div style={{ textAlign: "center", width: "100%", maxWidth: 640 }}>
      {/* Clock */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "monospace", lineHeight: 1 }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{dateStr}</div>
      </div>

      {/* Action toggle */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setAction("CLOCK_IN")}
          data-variant={action === "CLOCK_IN" ? "primary" : undefined}
          style={{ padding: "12px 32px", fontSize: 18, fontWeight: 600 }}
        >
          出勤
        </button>
        <button
          type="button"
          onClick={() => setAction("CLOCK_OUT")}
          data-variant={action === "CLOCK_OUT" ? "primary" : undefined}
          style={{ padding: "12px 32px", fontSize: 18, fontWeight: 600 }}
        >
          退勤
        </button>
      </div>

      {/* Camera feed */}
      <div style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
        border: "3px solid var(--color-border)",
        background: "#000",
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", display: "block" }}
        />
        {state.phase === "detecting" && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            fontSize: 20,
            fontWeight: 600,
          }}>
            認識中...
          </div>
        )}
      </div>

      {/* Punch button */}
      {(state.phase === "ready" || state.phase === "detecting") && (
        <button
          type="button"
          onClick={handlePunch}
          disabled={state.phase === "detecting"}
          style={{
            width: "100%",
            padding: "16px 0",
            fontSize: 22,
            fontWeight: 700,
            borderRadius: 12,
            background: action === "CLOCK_IN" ? "var(--color-primary)" : "var(--color-danger)",
            color: "#fff",
            border: "none",
            cursor: state.phase === "detecting" ? "wait" : "pointer",
          }}
        >
          {state.phase === "detecting" ? "認識中..." : `顔で${action === "CLOCK_IN" ? "出勤" : "退勤"}する`}
        </button>
      )}

      {/* Loading state */}
      {state.phase === "loading" && (
        <p style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
          カメラ・認証モデルを読み込み中...
        </p>
      )}

      {/* Result overlay */}
      {state.phase === "result" && (
        <div style={{
          padding: 24,
          borderRadius: 12,
          background: state.success ? "var(--color-success)" : "var(--color-danger)",
          color: "#fff",
        }}>
          {state.success ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                {state.userName}
              </div>
              <div style={{ fontSize: 20 }}>
                {state.action} {state.time}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 18 }}>{state.message}</div>
          )}
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <p style={{ color: "var(--color-danger)", fontSize: 16 }}>{state.message}</p>
      )}

      {/* Stats */}
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 16 }}>
        登録済み: {descriptorsData.length} 件の顔データ
      </p>
    </div>
  );
}
