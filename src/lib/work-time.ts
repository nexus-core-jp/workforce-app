import { MINUTE_MS } from "./constants";

interface TimeEntryFields {
  clockInAt: Date | null;
  clockOutAt: Date | null;
  breakStartAt: Date | null;
  breakEndAt: Date | null;
}

export function computeWorkMinutes(entry: TimeEntryFields): number {
  if (!entry.clockInAt || !entry.clockOutAt) return 0;
  const total = diffMinutes(entry.clockInAt, entry.clockOutAt);
  let breakMin = 0;
  if (entry.breakStartAt && entry.breakEndAt) {
    breakMin = Math.max(0, diffMinutes(entry.breakStartAt, entry.breakEndAt));
  }
  return Math.max(0, total - breakMin);
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MINUTE_MS);
}
