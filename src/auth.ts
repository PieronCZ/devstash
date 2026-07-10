import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";

// Full config used throughout the app (server components, route handlers,
// server actions). Adds the Prisma adapter and the JWT session strategy on top
// of the edge-safe providers from auth.config.ts.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    // Persist the user id on the token at sign-in.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // Expose the user id on the session for the client/server.
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  ...authConfig,
});
