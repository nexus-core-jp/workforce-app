import { LOCALE, TIMEZONE } from "./constants";
import { addJstDays, startOfJstDay } from "./jst";

export { startOfJstDay, addJstDays };

export function formatLocal(dt?: Date | null): string {
  if (!dt) return "-";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(dt);
}

export function formatTimeOnly(dt?: Date | null): string {
  if (!dt) return "-";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

export { diffMinutes } from "./work-time";
