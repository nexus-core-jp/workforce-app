import { describe, it, expect } from "vitest";
import { startOfJstDay, addJstDays, toCloseMonth } from "@/lib/jst";

describe("startOfJstDay", () => {
  it("returns midnight JST as UTC Date", () => {
    // 2026-02-16 10:30:00 JST = 2026-02-16 01:30:00 UTC
    const date = new Date("2026-02-16T01:30:00Z");
    const result = startOfJstDay(date);
    // midnight JST = 15:00 UTC previous day
    expect(result.toISOString()).toBe("2026-02-15T15:00:00.000Z");
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
    const base = new Date("2026-02-15T15:00:00.000Z"); // midnight 2/16 JST
    const result = addJstDays(base, 3);
    expect(result.toISOString()).toBe("2026-02-18T15:00:00.000Z");
  });

  it("subtracts days correctly", () => {
    const base = new Date("2026-02-15T15:00:00.000Z");
    const result = addJstDays(base, -6);
    expect(result.toISOString()).toBe("2026-02-09T15:00:00.000Z");
  });
});

describe("toCloseMonth", () => {
  it("returns YYYY-MM in JST", () => {
    // 2026-01-31 23:30:00 JST = 2026-01-31 14:30:00 UTC
    const date = new Date("2026-01-31T14:30:00Z");
    expect(toCloseMonth(date)).toBe("2026-01");
  });

  it("handles month boundary correctly", () => {
    // 2026-02-01 00:30:00 JST = 2026-01-31 15:30:00 UTC
    const date = new Date("2026-01-31T15:30:00Z");
    expect(toCloseMonth(date)).toBe("2026-02");
  });
});
