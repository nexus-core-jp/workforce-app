import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the leave request schema from the API route for isolated testing
const createSchema = z.object({
  type: z.enum(["PAID", "HALF", "HOURLY", "ABSENCE"]),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  reason: z.string().max(500).optional(),
});

describe("leave request validation", () => {
  describe("createSchema", () => {
    it("accepts valid PAID leave request", () => {
      const result = createSchema.safeParse({
        type: "PAID",
        startAt: "2026-03-01T00:00:00+09:00",
        endAt: "2026-03-01T23:59:59+09:00",
        reason: "家庭の事情",
      });
      expect(result.success).toBe(true);
    });

    it("accepts request without reason", () => {
      const result = createSchema.safeParse({
        type: "HALF",
        startAt: "2026-03-01T00:00:00+09:00",
        endAt: "2026-03-01T23:59:59+09:00",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid leave type", () => {
      const result = createSchema.safeParse({
        type: "INVALID",
        startAt: "2026-03-01",
        endAt: "2026-03-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty startAt", () => {
      const result = createSchema.safeParse({
        type: "PAID",
        startAt: "",
        endAt: "2026-03-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty endAt", () => {
      const result = createSchema.safeParse({
        type: "PAID",
        startAt: "2026-03-01",
        endAt: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason exceeding 500 chars", () => {
      const result = createSchema.safeParse({
        type: "PAID",
        startAt: "2026-03-01",
        endAt: "2026-03-01",
        reason: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("accepts all leave types", () => {
      for (const type of ["PAID", "HALF", "HOURLY", "ABSENCE"]) {
        const result = createSchema.safeParse({
          type,
          startAt: "2026-03-01",
          endAt: "2026-03-01",
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("leave days calculation", () => {
    function calcLeaveDays(
      type: string,
      startAt: Date,
      endAt: Date,
    ): number {
      if (type === "HALF") return 0.5;
      if (type === "HOURLY") return 0;
      if (type === "ABSENCE") return 1;
      // PAID: count calendar days
      const days =
        Math.ceil(
          (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
      return days;
    }

    it("HALF leave = 0.5 days", () => {
      const start = new Date("2026-03-01");
      const end = new Date("2026-03-01");
      expect(calcLeaveDays("HALF", start, end)).toBe(0.5);
    });

    it("HOURLY leave = 0 days", () => {
      const start = new Date("2026-03-01");
      const end = new Date("2026-03-01");
      expect(calcLeaveDays("HOURLY", start, end)).toBe(0);
    });

    it("PAID single day = 1 day", () => {
      const start = new Date("2026-03-01");
      const end = new Date("2026-03-01");
      expect(calcLeaveDays("PAID", start, end)).toBe(1);
    });

    it("PAID 3 consecutive days", () => {
      const start = new Date("2026-03-01");
      const end = new Date("2026-03-03");
      expect(calcLeaveDays("PAID", start, end)).toBe(3);
    });

    it("ABSENCE = 1 day regardless of range", () => {
      const start = new Date("2026-03-01");
      const end = new Date("2026-03-05");
      expect(calcLeaveDays("ABSENCE", start, end)).toBe(1);
    });
  });

  describe("balance check logic", () => {
    function checkBalance(
      ledger: Array<{ kind: string; days: number }>,
      requiredDays: number,
    ): { balance: number; sufficient: boolean } {
      let balance = 0;
      for (const entry of ledger) {
        if (entry.kind === "USE") {
          balance -= entry.days;
        } else {
          balance += entry.days;
        }
      }
      return { balance, sufficient: balance >= requiredDays };
    }

    it("allows when balance is sufficient", () => {
      const ledger = [
        { kind: "GRANT", days: 10 },
        { kind: "USE", days: 3 },
      ];
      const result = checkBalance(ledger, 2);
      expect(result.balance).toBe(7);
      expect(result.sufficient).toBe(true);
    });

    it("rejects when balance is insufficient", () => {
      const ledger = [
        { kind: "GRANT", days: 10 },
        { kind: "USE", days: 9 },
      ];
      const result = checkBalance(ledger, 2);
      expect(result.balance).toBe(1);
      expect(result.sufficient).toBe(false);
    });

    it("handles empty ledger", () => {
      const result = checkBalance([], 1);
      expect(result.balance).toBe(0);
      expect(result.sufficient).toBe(false);
    });

    it("handles ADJUST entries", () => {
      const ledger = [
        { kind: "GRANT", days: 10 },
        { kind: "ADJUST", days: 5 },
        { kind: "USE", days: 12 },
      ];
      const result = checkBalance(ledger, 3);
      expect(result.balance).toBe(3);
      expect(result.sufficient).toBe(true);
    });

    it("handles half-day balance", () => {
      const ledger = [
        { kind: "GRANT", days: 1 },
        { kind: "USE", days: 0.5 },
      ];
      const result = checkBalance(ledger, 0.5);
      expect(result.balance).toBe(0.5);
      expect(result.sufficient).toBe(true);
    });
  });
});
