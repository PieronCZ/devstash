import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

// Verification links stay valid for 24 hours.
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

/**
 * Issue a fresh email-verification token for `email`, replacing any existing
 * ones so only the most recent link works. Returns the raw token to embed in
 * the verification URL. `email` is expected already normalized (trim/lowercase).
 */
export async function createVerificationToken(email: string): Promise<string> {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  return token;
}

export type VerifyTokenResult = "success" | "invalid" | "expired";

/**
 * Validate and consume a verification token. On success the matching user's
 * `emailVerified` is set. The token is always deleted once presented (single
 * use), whether it was valid, expired, or its user no longer exists.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<VerifyTokenResult> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) return "invalid";

  // Single use: remove it now regardless of outcome.
  await prisma.verificationToken.deleteMany({ where: { token } });

  if (record.expires < new Date()) return "expired";

  // The user could have been deleted between issuing and consuming the token.
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
