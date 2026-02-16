import { describe, it, expect } from "vitest";
import { formatLocal, diffMinutes } from "@/lib/time";

describe("diffMinutes", () => {
  it("calculates positive difference", () => {
    const a = new Date("2026-02-16T00:00:00Z");
    const b = new Date("2026-02-16T01:30:00Z");
    expect(diffMinutes(a, b)).toBe(90);
  });

  it("returns 0 for same time", () => {
    const a = new Date("2026-02-16T09:00:00Z");
    expect(diffMinutes(a, a)).toBe(0);
  });

  it("handles 8 hour workday", () => {
    const a = new Date("2026-02-16T00:00:00Z");
    const b = new Date("2026-02-16T08:00:00Z");
    expect(diffMinutes(a, b)).toBe(480);
  });
});

describe("formatLocal", () => {
  it("returns '-' for null", () => {
    expect(formatLocal(null)).toBe("-");
  });

  it("returns '-' for undefined", () => {
    expect(formatLocal(undefined)).toBe("-");
  });

  it("formats a date in JST", () => {
    // 2026-02-16 09:30:00 JST = 2026-02-16 00:30:00 UTC
    const dt = new Date("2026-02-16T00:30:00Z");
    const result = formatLocal(dt);
    expect(result).toContain("2026");
    expect(result).toContain("09");
    expect(result).toContain("30");
  });
});
