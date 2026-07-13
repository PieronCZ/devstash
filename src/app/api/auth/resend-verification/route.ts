import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validations/auth";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { isEmailVerificationEnabled } from "@/lib/auth-flags";
import { getAppUrl } from "@/lib/app-url";
import { checkRateLimit, getClientIp, limiters, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({ email: emailSchema });

// Shared generic response — never reveals account state.
const genericOk = () =>
  NextResponse.json(
    { message: "If that account needs verification, a new link is on its way." },
    { status: 200 },
  );

// POST /api/auth/resend-verification { email }
// Re-issues a verification link for an unverified credentials account. Always
// responds 200 with a generic message so it never reveals whether an email is
// registered or already verified.
export async function POST(request: Request) {
  // No-op when verification is disabled — nothing to (re)send.
  if (!isEmailVerificationEnabled()) return genericOk();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Rate limit by IP + email (3 / 15 min) — caps re-send spam per target inbox.
  const rl = await checkRateLimit(limiters.resendVerification, `${getClientIp(request)}:${email}`);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, emailVerified: true },
  });

  // Only (re)send for a real, credentials-based, still-unverified account.
  if (user?.passwordHash && !user.emailVerified) {
    try {
      const token = await createVerificationToken(email);
      await sendVerificationEmail(email, token, getAppUrl());
    } catch (err) {
      console.error("Failed to resend verification email:", err);
    }
  }

  return genericOk();
}
