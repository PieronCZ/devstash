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
