// In-memory rate limiter (§8 of spec).
// Backed by CacheService so it works in a single-process Next.js dev server.
// For multi-instance production deployments, swap this out for a Redis-backed limiter.

import { cache } from "@/lib/cache";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the bucket resets. */
  retryAfter: number;
  /** Unix ms timestamp when the bucket resets. */
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

/**
 * Check (and increment) the rate limit for a key.
 *
 * @param key      Identifier, e.g. `resume_upload:user:<id>` or `api:user:<id>`.
 * @param max      Maximum number of requests allowed in the window.
 * @param windowSeconds Window duration in seconds.
 */
export async function consumeRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const ttlOverride = windowSeconds + 5; // small buffer so the cache doesn't expire before reset

  const bucket = await cache.update<Bucket>(
    `ratelimit:${key}`,
    (current) => {
      if (!current || current.resetAt <= now) {
        return { count: 1, resetAt: now + windowSeconds * 1000 };
      }
      return { count: current.count + 1, resetAt: current.resetAt };
    },
    ttlOverride,
  );

  const remaining = Math.max(0, max - bucket.count);
  const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    ok: bucket.count <= max,
    remaining,
    retryAfter,
    resetAt: bucket.resetAt,
  };
}

/** Peek the current bucket without consuming a slot. */
export async function peekRateLimit(key: string): Promise<RateLimitResult | null> {
  const bucket = await cache.get<Bucket>(`ratelimit:${key}`);
  if (!bucket) return null;
  const now = Date.now();
  if (bucket.resetAt <= now) return null;
  return {
    ok: true,
    remaining: bucket.count,
    retryAfter: Math.max(0, Math.ceil((bucket.resetAt - now) / 1000)),
    resetAt: bucket.resetAt,
  };
}
