import { DAY_MS, JST_OFFSET_MS, TIMEZONE } from "./constants";

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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).format(date);
}
