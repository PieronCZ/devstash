import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { formatRetryAfter } from "@/lib/format";
import { isRateLimitingEnabled } from "@/lib/auth-flags";

// ─────────────────────────── Upstash client ───────────────────────────
//
// Rate limiting is backed by Upstash Redis (serverless-friendly REST client).
// When the credentials are absent (local dev without an Upstash project, or a
// misconfigured deployment) `redis` is null and every limiter is null, so the
// system FAILS OPEN — requests are allowed rather than blocked. Never let a
// missing/broken cache lock users out of auth.
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — auth rate limiting is DISABLED (failing open).",
  );
}

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];

function makeLimiter(limit: number, window: Duration, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix,
    // Analytics writes extra keys per request; not needed and eats the free tier.
    analytics: false,
  });
}

// One limiter per protected endpoint. Limits/windows come from the feature spec.
export const limiters = {
  // login — keyed by IP + email
  login: makeLimiter(5, "15 m", "rl:login"),
  // register — keyed by IP
  register: makeLimiter(3, "1 h", "rl:register"),
  // forgot-password — keyed by IP
  forgotPassword: makeLimiter(3, "1 h", "rl:forgot"),
  // reset-password — keyed by IP
  resetPassword: makeLimiter(5, "15 m", "rl:reset"),
  // resend-verification — keyed by IP + email
  resendVerification: makeLimiter(3, "15 m", "rl:resend"),
} as const;

// ─────────────────────────── Check helper ───────────────────────────

export interface RateLimitResult {
  success: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Epoch ms when the window resets (0 when limiting is disabled). */
  reset: number;
}

// Run a limiter for `key`. Fails open when limiting is disabled (see
// isRateLimitingEnabled — off in dev), when there's no limiter (missing Upstash
// creds), or on any error, so neither dev nor a Redis outage blocks auth.
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter || !isRateLimitingEnabled()) {
    return { success: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };
  }

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return { success, remaining, reset };
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request:", err);
    return { success: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };
  }
}

// ─────────────────────────── Client IP ───────────────────────────

// Best-effort client IP. Behind Vercel/most proxies the real client is the
// first entry of `x-forwarded-for`; fall back to `x-real-ip`, then a constant
// so a missing header buckets everyone together (still safer than per-request).
export function ipFromHeaders(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function getClientIp(request: Request): string {
  return ipFromHeaders(request.headers);
}

// Seconds until the window resets, floored at 1. Shared by the 429 response and
// the login path (which surfaces the exact wait through the NextAuth error code).
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

// ─────────────────────────── 429 response ───────────────────────────

// Build the standard 429 for a blocked request, including a `Retry-After`
// header (seconds) and a user-friendly message stating the exact wait.
export function rateLimitResponse(reset: number): NextResponse {
  const seconds = retryAfterSeconds(reset);
  return NextResponse.json(
    {
      error: `Too many attempts. Please try again in ${formatRetryAfter(seconds)}.`,
      retryAfter: seconds,
    },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}
