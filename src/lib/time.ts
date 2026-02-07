// Time helpers (JST, date-only semantics)

import { addJstDays, startOfJstDay } from "@/lib/jst";

export { startOfJstDay, addJstDays };

export function formatLocal(dt?: Date | null): string {
  if (!dt) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(dt);
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}
