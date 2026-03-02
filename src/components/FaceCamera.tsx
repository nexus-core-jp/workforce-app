"use client";

import { useRef, useState, useEffect, useCallback } from "react";

/**
 * FaceCamera — browser-side face detection & descriptor extraction.
 *
 * Loads face-api.js models from /models/ and streams the user's webcam.
 * When a single face with sufficient detection confidence is found the
 * 128-dimensional descriptor is passed to `onDescriptor`.
 *
 * The component is intentionally "headless" in terms of business logic — it
 * handles only camera + ML.  The parent decides what to do with descriptors
 * (registration vs. verification).
 */

/* face-api.js types — imported dynamically to avoid SSR issues */
type FaceApiModule = typeof import("face-api.js");

/** Minimum detection score to accept a capture (0-1). */
const MIN_SCORE = 0.5;
/** Path from which face-api.js model weights are served. */
const MODEL_URL = "/models";

interface FaceCameraProps {
  /** Called when a valid face descriptor is extracted. */
  onDescriptor: (descriptor: number[]) => void;
  /** Called when the user cancels / closes the camera. */
  onCancel: () => void;
  /** Button label for the capture action. */
  captureLabel?: string;
}

export function FaceCamera({
  onDescriptor,
  onCancel,
  captureLabel = "撮影",
}: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<FaceApiModule | null>(null);

  const [status, setStatus] = useState<
    "loading" | "ready" | "capturing" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // Detection loop interval ref
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Initialise face-api + camera ─────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Dynamic import — face-api.js requires browser APIs
        const faceapi = await import("face-api.js");
        faceapiRef.current = faceapi;

        // Load the models we need
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        if (cancelled) return;

        // Start the camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setStatus("ready");
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "カメラへのアクセスが拒否されました。ブラウザの設定でカメラを許可してください。"
            : e instanceof Error
              ? e.message
              : "カメラの起動に失敗しました";
        setError(msg);
        setStatus("error");
      }
    }

    init();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ── Real-time face detection indicator ───────────────────── */
  useEffect(() => {
    if (status !== "ready") return;

    const detect = async () => {
      const faceapi = faceapiRef.current;
      const video = videoRef.current;
      if (!faceapi || !video || video.readyState < 2) return;

      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      setFaceDetected(!!result && result.detection.score >= MIN_SCORE);
    };

    intervalRef.current = setInterval(detect, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  /* ── Capture ──────────────────────────────────────────────── */
  const handleCapture = useCallback(async () => {
    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video) return;

    setStatus("capturing");
    setError(null);

    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result || result.detection.score < MIN_SCORE) {
        setError("顔を検出できませんでした。カメラに顔を正面から映してください。");
        setStatus("ready");
        return;
      }

      // Convert Float32Array → plain number array
      const descriptor = Array.from(result.descriptor);
      onDescriptor(descriptor);
    } catch {
      setError("顔の解析に失敗しました。もう一度お試しください。");
    }

    setStatus("ready");
  }, [onDescriptor]);

  /* ── Cleanup on unmount / cancel ──────────────────────────── */
  const handleCancel = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  }, [onCancel]);

  return (
    <div style={{ textAlign: "center" }}>
      {/* Camera preview */}
      <div
        style={{
          position: "relative",
          display: "inline-block",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          border: `3px solid ${faceDetected ? "var(--color-success)" : "var(--color-border)"}`,
          transition: "border-color 0.2s",
          background: "var(--color-bg, #000)",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: 360,
            maxWidth: "100%",
            display: status === "error" ? "none" : "block",
            transform: "scaleX(-1)",
          }}
        />
        {status === "loading" && (
          <div
            style={{
              width: 360,
              height: 270,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text, #fff)",
              fontSize: 14,
            }}
          >
            カメラとモデルを読み込み中...
          </div>
        )}
      </div>

      {/* Status indicator */}
      {status === "ready" && (
        <p
          style={{
            margin: "8px 0",
            fontSize: 13,
            color: faceDetected ? "var(--color-success)" : "var(--color-text-secondary)",
          }}
        >
          {faceDetected
            ? "顔を検出しました"
            : "顔が検出されていません — カメラに正面を向けてください"}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="error-text" style={{ margin: "8px 0" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button
          data-variant="primary"
          disabled={status !== "ready" || !faceDetected}
          onClick={handleCapture}
        >
          {status === "capturing" ? "処理中..." : captureLabel}
        </button>
        <button onClick={handleCancel}>キャンセル</button>
      </div>
    </div>
  );
}
