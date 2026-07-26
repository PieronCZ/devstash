import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Next.js 16 proxy (formerly middleware). Runs on the edge, so it uses the
// adapter-free auth.config.ts — never import the full auth.ts here.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/items") ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/profile");

  if (isProtected && !isLoggedIn) {
    // Redirect to the custom sign-in page, preserving where the user was
    // headed so they land back there after authenticating.
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/items/:path*",
    "/collections/:path*",
    "/profile/:path*",
  ],
};
