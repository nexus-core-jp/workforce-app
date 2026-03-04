"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LeaveDecideButtons({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const decide = (decision: "APPROVED" | "REJECTED") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leave-requests/decide", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, decision }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <button disabled={isPending} onClick={() => decide("APPROVED")} style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
        承認
      </button>
      <button disabled={isPending} onClick={() => decide("REJECTED")} style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
        却下
      </button>
      {error ? <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>{error}</span> : null}
    </div>
  );
}
