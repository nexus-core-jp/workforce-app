import { describe, it, expect, vi, beforeEach } from "vitest";

describe("validateEnv", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws if DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).toThrow("DATABASE_URL");
  });

  it("throws if AUTH_SECRET is missing", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("AUTH_SECRET", "");
    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).toThrow("AUTH_SECRET");
  });

  it("does not throw if all vars are set", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("AUTH_SECRET", "test-secret-32chars-long-enough!");
    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).not.toThrow();
  });
});
