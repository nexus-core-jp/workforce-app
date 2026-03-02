"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./dashboard.module.css";

export interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error";
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, type: "success" | "error" = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, show };
}

export function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 2700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError} ${fading ? styles.toastFadeOut : ""}`}
    >
      {toast.type === "success" ? "\u2713" : "!"} {toast.text}
    </div>
  );
}
