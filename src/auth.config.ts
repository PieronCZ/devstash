import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible config: providers only, no adapter or database access.
// Safe to import in the proxy (edge runtime) and re-used by the full config
// in auth.ts.
//
// The Credentials provider is declared here as a placeholder so the proxy
// knows it exists, but its real bcrypt/DB-backed `authorize` lives in auth.ts
// (Node runtime) — bcryptjs and Prisma can't run on the edge.
export default {
  // Custom auth UI (phase 3) — replaces NextAuth's default sign-in page.
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GitHub,
    Credentials({
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig;
