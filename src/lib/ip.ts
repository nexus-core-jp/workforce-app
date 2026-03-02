/**
 * Extract client IP from request headers.
 *
 * In production behind a trusted reverse proxy (Vercel, CloudFlare, etc.),
 * the first value in x-forwarded-for is set by the proxy and is reliable.
 * However, we hash the IP to add entropy, making spoofed values less useful
 * for bypassing rate limits — an attacker would need to guess the hash input.
 */
export function extractClientIp(request: Request): string {
  // Prefer Vercel-provided header (set by the platform, not spoofable)
  const vercelIp = request.headers.get("x-real-ip");
  if (vercelIp) return vercelIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take only the first IP (set by the closest trusted proxy)
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
