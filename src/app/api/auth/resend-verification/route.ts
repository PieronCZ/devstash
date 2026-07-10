import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validations/auth";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

const bodySchema = z.object({ email: emailSchema });

// POST /api/auth/resend-verification { email }
// Re-issues a verification link for an unverified credentials account. Always
// responds 200 with a generic message so it never reveals whether an email is
// registered or already verified.
export async function POST(request: Request) {
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
  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, emailVerified: true },
  });

  // Only (re)send for a real, credentials-based, still-unverified account.
  if (user?.passwordHash && !user.emailVerified) {
    try {
      const token = await createVerificationToken(email);
      await sendVerificationEmail(email, token, new URL(request.url).origin);
    } catch (err) {
      console.error("Failed to resend verification email:", err);
    }
  }

  return NextResponse.json(
    { message: "If that account needs verification, a new link is on its way." },
    { status: 200 },
  );
}
