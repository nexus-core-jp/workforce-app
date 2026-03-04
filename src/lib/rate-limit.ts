/**
 * Rate limiting utilities.
 *
 * Two implementations are provided:
 * 1. `rateLimit()` — Database-backed sliding window limiter, works correctly
 *    in serverless environments where in-memory state is not preserved.
 * 2. `checkRateLimit()` — Simple in-memory rate limiter for lightweight use.
 *    For production with multiple instances, consider replacing with Redis.
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// 1. Database-backed rate limiter (sliding window)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 2. In-memory rate limiter (fixed window)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  max: number;
  /** Window size in seconds */
  windowSec: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowSec * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.max - 1, resetAt };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Extract client IP from request headers (works behind common reverse proxies) */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
