// Auth feature flags, read from server-side env. Kept in one place so every
// consumer (register route, authorize, resend endpoint) shares one source of
// truth. Never expose these to the client via NEXT_PUBLIC_ — the register API
// echoes what the client needs (see `verificationRequired`).

const FALSEY = new Set(["false", "0", "off", "no"]);

/**
 * Whether the email-verification system is active.
 *
 * Controlled by `EMAIL_VERIFICATION_ENABLED`. Enabled by default (secure);
 * set the var to "false" / "0" / "off" / "no" to disable — e.g. while Resend
 * has no verified domain and can only deliver to its own account owner.
 *
 * When disabled: registration creates a usable, pre-verified account with no
 * token or email, and sign-in is not gated on `emailVerified`.
 */
export function isEmailVerificationEnabled(): boolean {
  const raw = process.env.EMAIL_VERIFICATION_ENABLED?.trim().toLowerCase();
  if (!raw) return true;
  return !FALSEY.has(raw);
}

const TRUTHY = new Set(["true", "1", "on", "yes"]);

/**
 * Whether auth rate limiting is active.
 *
 * Controlled by `RATE_LIMIT_ENABLED`. When unset it defaults to **production
 * only**: local dev never has a real client IP (`x-forwarded-for` is absent on
 * localhost, so every request buckets under "unknown" and shares one limit),
 * which makes limiting actively hostile to development — and this project keeps
 * everything open in dev anyway. Set the var to "true"/"1"/"on"/"yes" to force
 * it on locally (to test the limits), or "false"/"0"/"off"/"no" to force off.
 *
 * Even when enabled, limiting still fails open if Upstash is unreachable or its
 * credentials are missing (see `checkRateLimit`).
 */
export function isRateLimitingEnabled(): boolean {
  const raw = process.env.RATE_LIMIT_ENABLED?.trim().toLowerCase();
  if (raw && TRUTHY.has(raw)) return true;
  if (raw && FALSEY.has(raw)) return false;
  return process.env.NODE_ENV === "production";
}
