import { describe, it, expect } from "vitest";
import { computeWorkMinutes, diffMinutes } from "../work-time";

describe("diffMinutes", () => {
  it("returns difference in minutes between two dates", () => {
    const a = new Date("2026-02-09T09:00:00Z");
    const b = new Date("2026-02-09T17:30:00Z");
    expect(diffMinutes(a, b)).toBe(510); // 8h30m
  });

  it("returns 0 for same time", () => {
    const a = new Date("2026-02-09T09:00:00Z");
    expect(diffMinutes(a, a)).toBe(0);
  });

  it("floors partial minutes", () => {
    const a = new Date("2026-02-09T09:00:00Z");
    const b = new Date("2026-02-09T09:01:30Z"); // 1.5 minutes
    expect(diffMinutes(a, b)).toBe(1);
  });
});

describe("computeWorkMinutes", () => {
  it("returns 0 when clockIn is null", () => {
    expect(
      computeWorkMinutes({
        clockInAt: null,
        clockOutAt: null,
        breakStartAt: null,
        breakEndAt: null,
      }),
    ).toBe(0);
  });

  it("returns 0 when clockOut is null", () => {
    expect(
      computeWorkMinutes({
        clockInAt: new Date("2026-02-09T09:00:00Z"),
        clockOutAt: null,
        breakStartAt: null,
        breakEndAt: null,
      }),
    ).toBe(0);
  });

  it("calculates total minutes without break", () => {
    expect(
      computeWorkMinutes({
        clockInAt: new Date("2026-02-09T09:00:00Z"),
        clockOutAt: new Date("2026-02-09T18:00:00Z"),
        breakStartAt: null,
        breakEndAt: null,
      }),
    ).toBe(540); // 9 hours
  });

  it("subtracts break time from total", () => {
    expect(
      computeWorkMinutes({
        clockInAt: new Date("2026-02-09T09:00:00Z"),
        clockOutAt: new Date("2026-02-09T18:00:00Z"),
        breakStartAt: new Date("2026-02-09T12:00:00Z"),
        breakEndAt: new Date("2026-02-09T13:00:00Z"),
      }),
    ).toBe(480); // 9h - 1h break = 8h
  });

  it("handles break without end (only breakStart)", () => {
    expect(
      computeWorkMinutes({
        clockInAt: new Date("2026-02-09T09:00:00Z"),
        clockOutAt: new Date("2026-02-09T18:00:00Z"),
        breakStartAt: new Date("2026-02-09T12:00:00Z"),
        breakEndAt: null,
      }),
    ).toBe(540); // break not completed, so no deduction
  });

  it("never returns negative", () => {
    expect(
      computeWorkMinutes({
        clockInAt: new Date("2026-02-09T09:00:00Z"),
        clockOutAt: new Date("2026-02-09T09:30:00Z"),
        breakStartAt: new Date("2026-02-09T09:00:00Z"),
        breakEndAt: new Date("2026-02-09T10:00:00Z"), // break > total
      }),
    ).toBe(0);
  });

  it("handles short work period with 30-minute break", () => {
    expect(
      computeWorkMinutes({
        clockInAt: new Date("2026-02-09T09:00:00Z"),
        clockOutAt: new Date("2026-02-09T12:30:00Z"),
        breakStartAt: new Date("2026-02-09T11:30:00Z"),
        breakEndAt: new Date("2026-02-09T12:00:00Z"),
      }),
    ).toBe(180); // 3.5h - 0.5h = 3h
  });
});
