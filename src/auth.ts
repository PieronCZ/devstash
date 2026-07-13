import NextAuth, { CredentialsSignin } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { credentialsSchema } from "@/lib/validations/auth";
import { isEmailVerificationEnabled } from "@/lib/auth-flags";

// Thrown when the password is correct but the account's email isn't verified.
// The `code` is surfaced to the client so the sign-in form can prompt the user
// to check their inbox / resend the link (rather than a generic error).
class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

// Full config used throughout the app (server components, route handlers,
// server actions). Adds the Prisma adapter and the JWT session strategy on top
// of the edge-safe providers from auth.config.ts, and swaps the placeholder
// Credentials provider for one with real bcrypt/DB-backed validation (this
// module runs on the Node runtime, so bcryptjs and Prisma are available).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });

        // Reject unknown users and OAuth-only accounts (no password set).
        if (!user?.passwordHash) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        // Block sign-in until the email is verified (credentials accounts only;
        // GitHub OAuth accounts are provider-verified and never hit this path).
        // Skipped entirely when email verification is disabled.
        if (isEmailVerificationEnabled() && !user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    // Persist the user id at sign-in and enforce session invalidation on
    // password change/reset. At sign-in we snapshot the user's current
    // `passwordChangedAt` onto the token; on every later request we re-read it
    // from the DB and, if the password has changed since this token was issued,
    // return null so NextAuth clears the session cookie (forced sign-out).
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      const id = token.id as string | undefined;
      if (!id) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id },
        select: { passwordChangedAt: true },
      });

      // Account deleted out from under the token → invalidate.
      if (!dbUser) return null;

      const changedAt = dbUser.passwordChangedAt?.getTime() ?? 0;

      // Fresh sign-in: record the baseline the token is trusted from.
      if (user) {
        token.passwordChangedAt = changedAt;
        return token;
      }

      // Existing token: reject if the password changed after it was issued.
      const issuedAt = (token.passwordChangedAt as number | undefined) ?? 0;
      if (issuedAt < changedAt) return null;

      return token;
    },
    // Expose the user id on the session for the client/server.
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
