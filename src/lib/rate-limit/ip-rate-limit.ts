import type { NextRequest } from "next/server";

export interface RateLimitOptions {
  /** Time window in milliseconds. */
  windowMs?: number;
  /** Maximum number of requests allowed inside the window. */
  maxRequests?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

function nowMs(): number {
  return Date.now();
}

function getBucket(key: string, windowMs: number): Bucket {
  const existing = store.get(key);
  const current = nowMs();

  if (existing && existing.resetAt > current) {
    return existing;
  }

  const bucket: Bucket = {
    count: 0,
    resetAt: current + windowMs,
  };
  store.set(key, bucket);
  return bucket;
}

/**
 * In-memory per-identifier rate limiter. Intended for public API routes
 * where we cannot rely on an external cache (Redis) in the demo deployment.
 * The store is process-local and resets on deploy/restart.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {},
): RateLimitResult {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 30;

  const bucket = getBucket(identifier, windowMs);
  const remaining = Math.max(0, maxRequests - bucket.count - 1);
  const allowed = bucket.count < maxRequests;

  if (allowed) {
    bucket.count += 1;
  }

  return {
    allowed,
    limit: maxRequests,
    remaining,
    resetAt: bucket.resetAt,
  };
}

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const forwardedIp = forwarded?.split(",")[0]?.trim();
  const requestWithIp = request as NextRequest & { ip?: string };
  return requestWithIp.ip ?? forwardedIp ?? "unknown";
}

/**
 * Remove stale buckets. Exposed for tests and for optional periodic cleanup.
 */
export function cleanupExpiredBuckets(): void {
  const current = nowMs();
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= current) {
      store.delete(key);
    }
  }
}
