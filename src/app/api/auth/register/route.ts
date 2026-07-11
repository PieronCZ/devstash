import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { isEmailVerificationEnabled } from "@/lib/auth-flags";

// Matches the seed script's cost factor so hashes are consistent across sources.
const BCRYPT_ROUNDS = 12;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const verificationEnabled = isEmailVerificationEnabled();

  try {
    const user = await prisma.user.create({
      // When verification is off, mark the account trusted at creation so
      // re-enabling the flag later never strands existing users.
      data: verificationEnabled
        ? { name, email, passwordHash }
        : { name, email, passwordHash, emailVerified: new Date() },
      select: { id: true, name: true, email: true },
    });

    // Issue a verification token and email the link. If the email fails we
    // still report success (the account exists) — the user can request a new
    // link from the "check your email" page.
    if (verificationEnabled) {
      try {
        const token = await createVerificationToken(email);
        await sendVerificationEmail(email, token, new URL(request.url).origin);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
      }
    }

    // `verificationRequired` tells the client whether to route to /check-email
    // or sign the user straight in (the client can't read the server env).
    return NextResponse.json(
      { user, verificationRequired: verificationEnabled },
      { status: 201 },
    );
  } catch (err) {
    // Unique-constraint violation on email — a concurrent request won the race
    // between the findUnique check above and this create.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
