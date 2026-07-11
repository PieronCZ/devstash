import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { consumePasswordResetToken } from "@/lib/tokens";

// Matches the seed/register cost factor so hashes are consistent across sources.
const BCRYPT_ROUNDS = 12;

// POST /api/auth/reset-password { token, password, confirmPassword }
// Consumes the reset token and sets a new password hash.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  const email = await consumePasswordResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Set the new password and mark the email verified — receiving the reset
  // email proves ownership. updateMany avoids a throw if the account was
  // deleted between issuing and consuming the token.
  const result = await prisma.user.updateMany({
    where: { email },
    data: { passwordHash, emailVerified: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Password updated." }, { status: 200 });
}
