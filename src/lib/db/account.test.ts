import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserHasPassword } from "@/lib/db/account";

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserHasPassword", () => {
  it("scopes the lookup to the user and selects only the hash", async () => {
    findUnique.mockResolvedValue({ passwordHash: "hashed" });

    await getUserHasPassword("user-1");

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { passwordHash: true },
    });
  });

  it("returns true for a credentials account", async () => {
    findUnique.mockResolvedValue({ passwordHash: "hashed" });
    expect(await getUserHasPassword("user-1")).toBe(true);
  });

  it("returns false for an OAuth-only account (no hash)", async () => {
    findUnique.mockResolvedValue({ passwordHash: null });
    expect(await getUserHasPassword("user-1")).toBe(false);
  });

  it("returns false when the user isn't found", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getUserHasPassword("nope")).toBe(false);
  });
});
