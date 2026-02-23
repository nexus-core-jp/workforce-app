import { describe, it, expect } from "vitest";
import { formatLocal, diffMinutes } from "@/lib/time";

describe("formatLocal", () => {
  it("returns '-' for null", () => {
    expect(formatLocal(null)).toBe("-");
  });

  it("returns '-' for undefined", () => {
    expect(formatLocal(undefined)).toBe("-");
  });

  it("formats a date in JST", () => {
    // 2026-02-23 09:00:00 JST = 2026-02-23 00:00:00 UTC
    const dt = new Date("2026-02-23T00:00:00Z");
    const result = formatLocal(dt);
    // Should contain 2026/02/23 09:00:00 in ja-JP format
    expect(result).toContain("2026");
    expect(result).toContain("02");
    expect(result).toContain("23");
    expect(result).toContain("09");
    expect(result).toContain("00");
  });
});

describe("diffMinutes", () => {
  it("calculates minutes between two dates", () => {
    const a = new Date("2026-02-23T00:00:00Z");
    const b = new Date("2026-02-23T01:30:00Z");
    expect(diffMinutes(a, b)).toBe(90);
  });

  it("returns 0 for same time", () => {
    const a = new Date("2026-02-23T00:00:00Z");
    expect(diffMinutes(a, a)).toBe(0);
  });

  it("returns negative for reverse order", () => {
    const a = new Date("2026-02-23T01:00:00Z");
    const b = new Date("2026-02-23T00:00:00Z");
    expect(diffMinutes(a, b)).toBe(-60);
  });

  it("floors partial minutes", () => {
    const a = new Date("2026-02-23T00:00:00Z");
    const b = new Date("2026-02-23T00:01:30Z"); // 1.5 minutes
    expect(diffMinutes(a, b)).toBe(1);
  });
});
