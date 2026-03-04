import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    rateLimitEntry: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.$transaction).mockImplementation(((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])) as any);
    vi.mocked(prisma.rateLimitEntry.create).mockResolvedValue({} as never);
    vi.mocked(prisma.rateLimitEntry.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.rateLimitEntry.findFirst).mockResolvedValue(null);
  });

  it("allows request when under limit", async () => {
    vi.mocked(prisma.rateLimitEntry.count).mockResolvedValue(3);
    const result = await rateLimit("test-key", 10, 60_000);
    expect(result.limited).toBe(false);
  });

  it("blocks request when at limit", async () => {
    vi.mocked(prisma.rateLimitEntry.count).mockResolvedValue(10);
    vi.mocked(prisma.rateLimitEntry.findFirst).mockResolvedValue({
      createdAt: new Date(),
    } as never);
    const result = await rateLimit("test-key", 10, 60_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfterMs).toBeDefined();
  });

  it("allows request on DB error (fail-open)", async () => {
    vi.mocked(prisma.rateLimitEntry.count).mockRejectedValue(new Error("DB down"));
    const result = await rateLimit("test-key", 10, 60_000);
    expect(result.limited).toBe(false);
  });
});
