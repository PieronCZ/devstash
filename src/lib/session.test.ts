import { beforeEach, describe, expect, it, vi } from "vitest";

// requireUserId composes `auth()` (from @/auth) and `redirect()` (from
// next/navigation) — mock both. `redirect` throws in Next to halt rendering, so
// the mock throws too (a sentinel) to model that control never falls through.
const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

class RedirectError extends Error {}
const redirectMock = vi.fn((url: string) => {
  throw new RedirectError(url);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

import { requireUserId } from "@/lib/session";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireUserId", () => {
  it("returns the user id when a session is present", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    await expect(requireUserId()).resolves.toBe("user-1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /sign-in when there is no session", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireUserId()).rejects.toBeInstanceOf(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to /sign-in when the session has no user id", async () => {
    authMock.mockResolvedValue({ user: {} });

    await expect(requireUserId()).rejects.toBeInstanceOf(RedirectError);
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  it("preserves the callbackUrl (encoded) when provided", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireUserId("/profile")).rejects.toBeInstanceOf(
      RedirectError,
    );
    expect(redirectMock).toHaveBeenCalledWith(
      "/sign-in?callbackUrl=%2Fprofile",
    );
  });
});
