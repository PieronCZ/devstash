import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    // Epoch ms of the user's last password change, captured at sign-in. Compared
    // against the DB on every request so tokens issued before a password
    // change/reset are invalidated.
    passwordChangedAt?: number;
  }
}
