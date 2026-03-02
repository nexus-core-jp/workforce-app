import { describe, it, expect } from "vitest";
import { ERROR_MESSAGES, PUNCH_LABELS, TIMEZONE, JST_OFFSET_MS, DAY_MS, MINUTE_MS } from "../constants";

describe("constants", () => {
  it("TIMEZONE is Asia/Tokyo", () => {
    expect(TIMEZONE).toBe("Asia/Tokyo");
  });

  it("JST_OFFSET_MS is 9 hours in milliseconds", () => {
    expect(JST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
  });

  it("DAY_MS is 24 hours in milliseconds", () => {
    expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("MINUTE_MS is 60 seconds in milliseconds", () => {
    expect(MINUTE_MS).toBe(60_000);
  });

  it("ERROR_MESSAGES contains all required keys in Japanese", () => {
    const requiredKeys = [
      "UNAUTHORIZED",
      "INVALID_SESSION",
      "FORBIDDEN",
      "MISSING_ACTION",
      "ALREADY_CLOCKED_IN",
      "NOT_CLOCKED_IN",
      "MONTH_CLOSED",
      "INVALID_INPUT",
      "NOT_FOUND",
      "ALREADY_DECIDED",
    ];
    for (const key of requiredKeys) {
      expect(ERROR_MESSAGES[key]).toBeDefined();
      expect(typeof ERROR_MESSAGES[key]).toBe("string");
      expect(ERROR_MESSAGES[key].length).toBeGreaterThan(0);
    }
  });

  it("PUNCH_LABELS has all four actions", () => {
    expect(PUNCH_LABELS.CLOCK_IN).toBe("\u51fa\u52e4");
    expect(PUNCH_LABELS.BREAK_START).toBe("\u4f11\u61a9\u958b\u59cb");
    expect(PUNCH_LABELS.BREAK_END).toBe("\u4f11\u61a9\u7d42\u4e86");
    expect(PUNCH_LABELS.CLOCK_OUT).toBe("\u9000\u52e4");
  });
});
