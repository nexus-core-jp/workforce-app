"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  fading: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type, fading: false }]);

    // Start fade out after 3 seconds
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fading: true } : t))
      );
    }, 3000);

    // Remove after fade
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3300);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast-item toast-${t.type} ${t.fading ? "toast-fade-out" : ""}`}
            >
              <span className="toast-icon" aria-hidden="true">
                {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
              </span>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
