import { describe, it, expect } from "vitest";
import { startOfJstDay, addJstDays, toCloseMonth } from "../jst";

describe("startOfJstDay", () => {
  it("returns midnight JST as UTC for a JST morning time", () => {
    // 2026-02-09 10:30 JST = 2026-02-09 01:30 UTC
    const input = new Date("2026-02-09T01:30:00Z");
    const result = startOfJstDay(input);
    // Midnight JST = 15:00 UTC previous day
    expect(result.toISOString()).toBe("2026-02-08T15:00:00.000Z");
  });

  it("returns midnight JST for a late UTC time (next day in JST)", () => {
    // 2026-02-09 23:00 UTC = 2026-02-10 08:00 JST
    const input = new Date("2026-02-09T23:00:00Z");
    const result = startOfJstDay(input);
    // Midnight 2026-02-10 JST = 2026-02-09 15:00 UTC
    expect(result.toISOString()).toBe("2026-02-09T15:00:00.000Z");
  });

  it("handles exactly midnight JST", () => {
    // Midnight JST = 15:00 UTC previous day
    const input = new Date("2026-02-08T15:00:00.000Z");
    const result = startOfJstDay(input);
    expect(result.toISOString()).toBe("2026-02-08T15:00:00.000Z");
  });
});

describe("addJstDays", () => {
  it("adds positive days", () => {
    const base = new Date("2026-02-08T15:00:00.000Z"); // midnight JST 2/9
    const result = addJstDays(base, 3);
    expect(result.toISOString()).toBe("2026-02-11T15:00:00.000Z");
  });

  it("subtracts days with negative value", () => {
    const base = new Date("2026-02-08T15:00:00.000Z");
    const result = addJstDays(base, -1);
    expect(result.toISOString()).toBe("2026-02-07T15:00:00.000Z");
  });

  it("adding 0 days returns same time", () => {
    const base = new Date("2026-02-08T15:00:00.000Z");
    const result = addJstDays(base, 0);
    expect(result.getTime()).toBe(base.getTime());
  });
});

describe("toCloseMonth", () => {
  it("returns YYYY-MM for a JST date", () => {
    // 2026-02-09 10:00 JST = 2026-02-09 01:00 UTC
    const date = new Date("2026-02-09T01:00:00Z");
    expect(toCloseMonth(date)).toBe("2026-02");
  });

  it("handles month boundary correctly in JST", () => {
    // 2026-01-31 23:30 UTC = 2026-02-01 08:30 JST
    const date = new Date("2026-01-31T23:30:00Z");
    expect(toCloseMonth(date)).toBe("2026-02");
  });
});
