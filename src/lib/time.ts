// Time helpers (JST, date-only semantics)

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns a Date representing the start of the day in JST (00:00 JST), stored as a UTC Date.
 * This is useful for "date-only semantics" while keeping a single DateTime column.
 */
export function startOfJstDay(date: Date = new Date()): Date {
  const jstMs = date.getTime() + JST_OFFSET_MS;
  const jstDayStartMs = Math.floor(jstMs / DAY_MS) * DAY_MS;
  const utcMs = jstDayStartMs - JST_OFFSET_MS;
  return new Date(utcMs);
}

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
