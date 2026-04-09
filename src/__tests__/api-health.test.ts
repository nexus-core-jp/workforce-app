import { describe, expect, it, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
    tenant: {
      count: vi.fn().mockResolvedValue(1),
    },
  },
}));

describe("GET /api/health", () => {
  it("returns healthy status", async () => {
    process.env.AUTH_SECRET = "x".repeat(48);
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeTruthy();
  });

  it("returns error when DB fails", async () => {
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("DB down"));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("degraded");
  });
});
