import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations/auth";

// Matches the seed/register/reset cost factor so hashes stay consistent.
const BCRYPT_ROUNDS = 12;

// POST /api/auth/change-password { currentPassword, password, confirmPassword }
// Verifies the signed-in user's current password and sets a new hash. Only
// works for credentials accounts (a passwordHash must already exist).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { currentPassword, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  // No password set — this is an OAuth-only (e.g. GitHub) account.
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Password changes aren't available for this account." },
      { status: 400 },
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Your current password is incorrect." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // Bump `passwordChangedAt` so every session issued before now (including this
  // one) is invalidated on its next request (see the jwt callback in auth.ts).
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  return NextResponse.json({ message: "Password updated." }, { status: 200 });
}
