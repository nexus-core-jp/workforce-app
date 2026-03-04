import { describe, it, expect } from "vitest";
import { startOfJstDay, addJstDays, toCloseMonth } from "@/lib/jst";

describe("startOfJstDay", () => {
  it("returns midnight JST for a given timestamp", () => {
    // 2026-02-23 10:30:00 JST = 2026-02-23 01:30:00 UTC
    const input = new Date("2026-02-23T01:30:00Z");
    const result = startOfJstDay(input);
    // midnight JST = 15:00 UTC previous day
    expect(result.toISOString()).toBe("2026-02-22T15:00:00.000Z");
  });

  it("handles timestamps already at midnight JST", () => {
    // midnight JST = 15:00 UTC previous day
    const input = new Date("2026-02-22T15:00:00Z");
    const result = startOfJstDay(input);
    expect(result.toISOString()).toBe("2026-02-22T15:00:00.000Z");
  });

  it("handles late night UTC that is next day in JST", () => {
    // 2026-02-23 23:00:00 UTC = 2026-02-24 08:00:00 JST
    const input = new Date("2026-02-23T23:00:00Z");
    const result = startOfJstDay(input);
    // midnight JST on 2026-02-24 = 2026-02-23T15:00:00Z
    expect(result.toISOString()).toBe("2026-02-23T15:00:00.000Z");
  });

  it("defaults to current time when no argument", () => {
    const result = startOfJstDay();
    expect(result).toBeInstanceOf(Date);
    // Should be today or yesterday at 15:00 UTC
    const hours = result.getUTCHours();
    expect(hours).toBe(15);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it("handles dates near midnight JST", () => {
    // 2026-02-16 00:01:00 JST = 2026-02-15 15:01:00 UTC
    const date = new Date("2026-02-15T15:01:00Z");
    const result = startOfJstDay(date);
    expect(result.toISOString()).toBe("2026-02-15T15:00:00.000Z");
  });

  it("handles dates just before midnight JST", () => {
    // 2026-02-15 23:59:00 JST = 2026-02-15 14:59:00 UTC
    const date = new Date("2026-02-15T14:59:00Z");
    const result = startOfJstDay(date);
    expect(result.toISOString()).toBe("2026-02-14T15:00:00.000Z");
  });
});

describe("addJstDays", () => {
  it("adds days correctly", () => {
    const base = new Date("2026-02-22T15:00:00.000Z"); // midnight JST Feb 23
    const result = addJstDays(base, 3);
    expect(result.toISOString()).toBe("2026-02-25T15:00:00.000Z");
  });

  it("subtracts days correctly", () => {
    const base = new Date("2026-02-22T15:00:00.000Z");
    const result = addJstDays(base, -2);
    expect(result.toISOString()).toBe("2026-02-20T15:00:00.000Z");
  });

  it("handles zero days", () => {
    const base = new Date("2026-02-22T15:00:00.000Z");
    const result = addJstDays(base, 0);
    expect(result.toISOString()).toBe("2026-02-22T15:00:00.000Z");
  });
});

describe("toCloseMonth", () => {
  it("returns YYYY-MM for JST", () => {
    // 2026-03-01 08:00:00 UTC = 2026-03-01 17:00:00 JST
    const input = new Date("2026-03-01T08:00:00Z");
    const result = toCloseMonth(input);
    expect(result).toBe("2026-03");
  });

  it("handles UTC date that is previous month in JST boundary", () => {
    // 2026-02-28 14:59:00 UTC = 2026-02-28 23:59:00 JST (still Feb)
    const input = new Date("2026-02-28T14:59:00Z");
    const result = toCloseMonth(input);
    expect(result).toBe("2026-02");
  });

  it("handles UTC date that crosses to next month in JST", () => {
    // 2026-02-28 15:01:00 UTC = 2026-03-01 00:01:00 JST (March)
    const input = new Date("2026-02-28T15:01:00Z");
    const result = toCloseMonth(input);
    expect(result).toBe("2026-03");
  });

  it("handles month boundary correctly", () => {
    // 2026-02-01 00:30:00 JST = 2026-01-31 15:30:00 UTC
    const date = new Date("2026-01-31T15:30:00Z");
    expect(toCloseMonth(date)).toBe("2026-02");
  });
});
