import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

// Tokens live for 24 hours (email verification and password reset alike).
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

// The NextAuth `VerificationToken` table is shared across token purposes. To
// keep purposes from clobbering each other (issuing replaces prior tokens for
// the same identifier), password-reset tokens are namespaced with a prefix,
// while email-verification tokens keep the bare email as identifier. A valid
// email can't contain ":", so the prefix is an unambiguous discriminator.
const RESET_PREFIX = "reset:";

/** Issue a fresh token for `identifier`, replacing any existing ones. */
async function issueToken(identifier: string): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.create({ data: { identifier, token, expires } });
  return token;
}

// ───────────────────── Email verification ─────────────────────

export async function createVerificationToken(email: string): Promise<string> {
  return issueToken(email);
}

export type VerifyTokenResult = "success" | "invalid" | "expired";

/**
 * Validate and consume an email-verification token, setting the user's
 * `emailVerified`. Ignores namespaced tokens (e.g. password reset) so they are
 * never burned by the wrong endpoint.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<VerifyTokenResult> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  // Missing, or a different purpose (namespaced identifier) → not ours.
  if (!record || record.identifier.includes(":")) return "invalid";

  await prisma.verificationToken.deleteMany({ where: { token } });

  if (record.expires < new Date()) return "expired";

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { id: true },
  });
  if (!user) return "invalid";

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  return "success";
}

// ───────────────────── Password reset ─────────────────────

export async function createPasswordResetToken(email: string): Promise<string> {
  return issueToken(`${RESET_PREFIX}${email}`);
}

/**
 * Validate and consume a password-reset token. Returns the associated email on
 * success (single use, expiry-checked), or null if the token is missing, not a
 * reset token, or expired. The caller updates the password.
 */
export async function consumePasswordResetToken(
  token: string,
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  // Missing, or not a reset token → leave it untouched.
  if (!record || !record.identifier.startsWith(RESET_PREFIX)) return null;

  await prisma.verificationToken.deleteMany({ where: { token } });

  if (record.expires < new Date()) return null;

  return record.identifier.slice(RESET_PREFIX.length);
}
