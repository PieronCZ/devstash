import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeVerificationToken } from "@/lib/tokens";

const bodySchema = z.object({ token: z.string().min(1) });

// POST /api/auth/verify-email { token }
// Consumes the verification token and sets the user's `emailVerified`. This is a
// POST (not a state-changing GET) so link-scanning mail proxies that prefetch
// the emailed link can't silently burn the token — the /verify-email page
// renders a confirm button that submits here on a real user click.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  const status = await consumeVerificationToken(parsed.data.token);

  // Always 200 — the outcome is carried in the body so the client can render
  // the right message (success / expired / invalid).
  return NextResponse.json({ status }, { status: 200 });
}
