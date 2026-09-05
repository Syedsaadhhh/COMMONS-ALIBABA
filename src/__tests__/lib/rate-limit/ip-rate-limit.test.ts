import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  getClientIdentifier,
  cleanupExpiredBuckets,
} from "@/lib/rate-limit/ip-rate-limit";
import type { NextRequest } from "next/server";

describe("ip-rate-limit", () => {
  beforeEach(() => {
    cleanupExpiredBuckets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the configured limit", () => {
    const id = "client-1";
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(id, { windowMs: 60_000, maxRequests: 5 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - i - 1);
    }
  });

  it("blocks requests that exceed the limit", () => {
    const id = "client-2";
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      checkRateLimit(id, { windowMs: 60_000, maxRequests: limit });
    }

    const blocked = checkRateLimit(id, { windowMs: 60_000, maxRequests: limit });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets the bucket after the window passes", () => {
    vi.useFakeTimers();
    const id = "client-3";
    const windowMs = 60_000;

    checkRateLimit(id, { windowMs, maxRequests: 1 });
    const blocked = checkRateLimit(id, { windowMs, maxRequests: 1 });
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);
    const reset = checkRateLimit(id, { windowMs, maxRequests: 1 });
    expect(reset.allowed).toBe(true);
  });

  it("derives the client identifier from request.ip when available", () => {
    const request = new Request("http://localhost/api/ai/plan", {
      method: "POST",
    }) as NextRequest;
    Object.defineProperty(request, "ip", { value: "203.0.113.4", configurable: true });
    expect(getClientIdentifier(request)).toBe("203.0.113.4");
  });

  it("falls back to x-forwarded-for when request.ip is missing", () => {
    const request = new Request("http://localhost/api/ai/plan", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
    }) as NextRequest;
    expect(getClientIdentifier(request)).toBe("198.51.100.7");
  });

  it("returns unknown when no identifier can be determined", () => {
    const request = new Request("http://localhost/api/ai/plan", {
      method: "POST",
    }) as NextRequest;
    expect(getClientIdentifier(request)).toBe("unknown");
  });
});
