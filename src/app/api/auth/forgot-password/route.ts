import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

// Shared generic response — never reveals whether an account exists.
const genericOk = () =>
  NextResponse.json(
    { message: "If an account exists for that email, a reset link is on its way." },
    { status: 200 },
  );

// POST /api/auth/forgot-password { email }
// Issues a reset token + emails the link for a real credentials account. Always
// responds 200 with a generic message (no account-existence leak).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });

  // Only send for a real, credentials-based account (OAuth-only accounts have
  // no password to reset).
  if (user?.passwordHash) {
    try {
      const token = await createPasswordResetToken(email);
      await sendPasswordResetEmail(email, token, new URL(request.url).origin);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return genericOk();
}
