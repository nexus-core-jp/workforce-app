"use client";

import { useState, useEffect, useRef, useTransition } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (data.ok) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // ignore
      }
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    startTransition(async () => {
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        load();
      } catch {
        // ignore
      }
    });
  };

  const markRead = (id: string) => {
    startTransition(async () => {
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        load();
      } catch {
        // ignore
      }
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}時間前`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}日前`;
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-compact"
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: "relative", minWidth: 36 }}
        aria-label="通知"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "var(--color-danger)",
              color: "#fff",
              borderRadius: "50%",
              width: 18,
              height: 18,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-md)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>通知</span>
            {unreadCount > 0 && (
              <button
                className="btn-compact"
                style={{ fontSize: 12 }}
                disabled={isPending}
                onClick={markAllRead}
              >
                全て既読
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              通知はありません
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--color-border)",
                  background: n.read ? undefined : "var(--color-bg)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  if (n.link) window.location.href = n.link;
                  setIsOpen(false);
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 13 }}>
                    {!n.read && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--color-primary)",
                          marginRight: 6,
                          verticalAlign: "middle",
                        }}
                      />
                    )}
                    {n.title}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", marginLeft: 8 }}>
                    {formatTime(n.createdAt)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {n.message}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
