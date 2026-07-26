import { redirect } from "next/navigation";

import { auth } from "@/auth";

// Resolve the signed-in user's id inside a protected server component,
// redirecting to sign-in when there's no session. The proxy already gates these
// routes, so this is the in-component fallback — and it narrows the id to a
// non-null string for the caller. `auth` is request-cached, so calling this in a
// layout and its page (or alongside another `auth()` in the same request)
// dedupes to a single resolution.
//
// Pass `callbackUrl` to send the user back to where they were after signing in.
export async function requireUserId(callbackUrl?: string): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(
      callbackUrl
        ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/sign-in",
    );
  }
  return userId;
}
