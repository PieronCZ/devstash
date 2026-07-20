import { beforeEach, describe, expect, it, vi } from "vitest";

import { searchTags } from "@/lib/db/tags";

const findMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  findMany.mockResolvedValue([{ name: "react" }, { name: "hooks" }]);
});

describe("searchTags", () => {
  it("maps the rows down to plain names", async () => {
    expect(await searchTags("user-1", "re")).toEqual(["react", "hooks"]);
  });

  it("scopes to the owner and filters case-insensitively by the query", async () => {
    await searchTags("user-1", "  Re  ");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          name: { contains: "Re", mode: "insensitive" },
        },
        take: 10,
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    );
  });

  it("omits the name filter when the query is blank", async () => {
    await searchTags("user-1", "   ");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("honors a custom limit", async () => {
    await searchTags("user-1", "x", 5);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});
