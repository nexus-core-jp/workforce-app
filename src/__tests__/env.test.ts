import { describe, it, expect, vi, beforeEach } from "vitest";

describe("validateEnv", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws if DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "test-secret");
    // The module calls validateEnv() at import time, so import itself should throw
    await expect(() => import("@/lib/env")).rejects.toThrow();
  });

  it("does not throw if all vars are set", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("AUTH_SECRET", "test-secret-32chars-long-enough!");
    const mod = await import("@/lib/env");
    expect(mod.env).toBeDefined();
    expect(mod.env.DATABASE_URL).toBe("postgresql://test");
  });
});
