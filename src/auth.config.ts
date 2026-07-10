import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible config: providers only, no adapter or database access.
// Safe to import in the proxy (edge runtime) and re-used by the full config
// in auth.ts. Credentials/DB-backed logic is added in auth.ts.
export default {
  providers: [GitHub],
} satisfies NextAuthConfig;
