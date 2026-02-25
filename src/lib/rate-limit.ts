/**
 * Database-backed rate limiter using a sliding window.
 * Works correctly in serverless environments (Vercel, etc.)
 * where in-memory state is not preserved across requests.
 */

import { prisma } from "@/lib/db";

/**
 * Check if a request should be rate-limited.
 * @param key - Unique identifier (e.g., "login:tenant:email" or "forgot:ip")
 * @param maxRequests - Max requests allowed within the window
 * @param windowMs - Time window in milliseconds
 * @returns { limited: true, retryAfterMs } if rate-limited, { limited: false } otherwise
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ limited: boolean; retryAfterMs?: number }> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  try {
    // Count recent entries and get the oldest one in window
    const [count, oldest] = await Promise.all([
      prisma.rateLimitEntry.count({
        where: { key, createdAt: { gt: cutoff } },
      }),
      prisma.rateLimitEntry.findFirst({
        where: { key, createdAt: { gt: cutoff } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    if (count >= maxRequests) {
      const retryAfterMs = oldest
        ? oldest.createdAt.getTime() + windowMs - now.getTime()
        : windowMs;
      return { limited: true, retryAfterMs };
    }

    // Record this request
    await prisma.rateLimitEntry.create({ data: { key } });

    // Periodically clean up old entries (non-blocking, 1% chance per request)
    if (Math.random() < 0.01) {
      prisma.rateLimitEntry
        .deleteMany({ where: { createdAt: { lt: cutoff } } })
        .catch(() => {});
    }

    return { limited: false };
  } catch {
    // If DB is unavailable, allow the request through
    return { limited: false };
  }
}
