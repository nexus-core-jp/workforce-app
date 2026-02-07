const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfJstDay(date: Date = new Date()): Date {
  const jstMs = date.getTime() + JST_OFFSET_MS;
  const jstDayStartMs = Math.floor(jstMs / DAY_MS) * DAY_MS;
  const utcMs = jstDayStartMs - JST_OFFSET_MS;
  return new Date(utcMs);
}

export function addJstDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function toCloseMonth(date: Date): string {
  // month string in JST: YYYY-MM
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(date);
  // en-CA returns YYYY-MM
  return ymd;
}
