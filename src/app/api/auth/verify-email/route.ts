import { NextResponse } from "next/server";

import { consumeVerificationToken } from "@/lib/tokens";

// GET /api/auth/verify-email?token=... — the target of the emailed link.
// Validates and consumes the token, then redirects to the /verify-email page
// with the outcome so the mutation stays out of React render.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  const status = token ? await consumeVerificationToken(token) : "invalid";

  return NextResponse.redirect(
    new URL(`/verify-email?status=${status}`, request.url),
  );
}
