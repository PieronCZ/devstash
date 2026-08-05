import { beforeEach, describe, expect, it, vi } from "vitest";

// rankItemTypesByUsage is pure, but the module imports the Prisma singleton at
// load time — stub it. createCollection uses prisma.collection.create and
// getCollectionDetail uses prisma.collection.findFirst, so mock both.
const collectionCreate = vi.fn();
const collectionFindFirst = vi.fn();
const collectionFindMany = vi.fn();
const collectionCount = vi.fn();
const collectionUpdateMany = vi.fn();
const collectionDeleteMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: {
      create: (...args: unknown[]) => collectionCreate(...args),
      findFirst: (...args: unknown[]) => collectionFindFirst(...args),
      findMany: (...args: unknown[]) => collectionFindMany(...args),
      count: (...args: unknown[]) => collectionCount(...args),
      updateMany: (...args: unknown[]) => collectionUpdateMany(...args),
      deleteMany: (...args: unknown[]) => collectionDeleteMany(...args),
    },
  },
}));

import {
  createCollection,
  deleteCollection,
  getCollectionDetail,
  getCollectionStats,
  getCollectionsPage,
  getRecentCollections,
  rankItemTypesByUsage,
  updateCollection,
} from "@/lib/db/collections";

beforeEach(() => {
  vi.clearAllMocks();
});

// Build the ItemCollection-join shape rankItemTypesByUsage consumes.
function rows<T extends { id: string }>(types: T[]): { item: { itemType: T } }[] {
  return types.map((itemType) => ({ item: { itemType } }));
}

describe("rankItemTypesByUsage", () => {
  it("returns an empty array for no items", () => {
    expect(rankItemTypesByUsage([])).toEqual([]);
  });

  it("dedupes types and ranks them most-used first", () => {
    const snippet = { id: "snippet", color: "#3b82f6" };
    const note = { id: "note", color: "#fde047" };
    const ranked = rankItemTypesByUsage(
      rows([snippet, note, snippet, snippet, note]),
    );
    expect(ranked).toEqual([snippet, note]);
  });

  it("keeps the full itemType object, not just the id", () => {
    const link = { id: "link", icon: "Link", color: "#10b981" };
    expect(rankItemTypesByUsage(rows([link]))).toEqual([link]);
  });

  it("orders by count regardless of first-seen order", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    // b appears once first, a appears three times after.
    const ranked = rankItemTypesByUsage(rows([b, a, a, a]));
    expect(ranked.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("createCollection", () => {
  it("connects the collection to the owner and returns the created row", async () => {
    collectionCreate.mockResolvedValue({
      id: "col-1",
      name: "React Patterns",
      description: "Handy hooks",
    });

    const result = await createCollection("user-1", {
      name: "React Patterns",
      description: "Handy hooks",
    });

    expect(result).toEqual({
      id: "col-1",
      name: "React Patterns",
      description: "Handy hooks",
    });
    expect(collectionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "React Patterns",
          description: "Handy hooks",
          user: { connect: { id: "user-1" } },
        }),
      }),
    );
  });

  it("stores a null description when none is provided", async () => {
    collectionCreate.mockResolvedValue({
      id: "col-2",
      name: "Empty",
      description: null,
    });

    await createCollection("user-1", { name: "Empty" });

    expect(collectionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      }),
    );
  });
});

describe("updateCollection", () => {
  it("writes name + description scoped to the owner and returns the refreshed row", async () => {
    collectionUpdateMany.mockResolvedValue({ count: 1 });
    collectionFindFirst.mockResolvedValue({
      id: "col-1",
      name: "React Patterns",
      description: "Now with hooks",
    });

    const result = await updateCollection("user-1", "col-1", {
      name: "React Patterns",
      description: "Now with hooks",
    });

    expect(result).toEqual({
      id: "col-1",
      name: "React Patterns",
      description: "Now with hooks",
    });
    expect(collectionUpdateMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      data: { name: "React Patterns", description: "Now with hooks" },
    });
  });

  it("stores a null description when cleared", async () => {
    collectionUpdateMany.mockResolvedValue({ count: 1 });
    collectionFindFirst.mockResolvedValue({
      id: "col-1",
      name: "React Patterns",
      description: null,
    });

    await updateCollection("user-1", "col-1", { name: "React Patterns" });

    expect(collectionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      }),
    );
  });

  it("returns null (without re-fetching) when nothing was updated (not owned)", async () => {
    collectionUpdateMany.mockResolvedValue({ count: 0 });

    const result = await updateCollection("user-1", "col-x", { name: "X" });

    expect(result).toBeNull();
    expect(collectionFindFirst).not.toHaveBeenCalled();
  });
});

describe("deleteCollection", () => {
  it("deletes scoped to the owner and returns true when a row was removed", async () => {
    collectionDeleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCollection("user-1", "col-1");

    expect(result).toBe(true);
    expect(collectionDeleteMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
    });
  });

  it("returns false when nothing was deleted (not found / not owned)", async () => {
    collectionDeleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteCollection("user-1", "col-x");

    expect(result).toBe(false);
  });
});

describe("getCollectionDetail", () => {
  it("returns null when the collection isn't found or owned by the user", async () => {
    collectionFindFirst.mockResolvedValue(null);

    const result = await getCollectionDetail("user-1", "col-x");

    expect(result).toBeNull();
    // Query is scoped to the requesting owner.
    expect(collectionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "col-x", userId: "user-1" },
      }),
    );
  });

  it("maps the collection's join items to card shapes (ISO dates, string tags) + total", async () => {
    const created = new Date("2026-07-01T00:00:00.000Z");
    const updated = new Date("2026-07-02T00:00:00.000Z");
    collectionFindFirst.mockResolvedValue({
      id: "col-1",
      name: "React Patterns",
      description: "Handy hooks",
      isFavorite: true,
      _count: { items: 30 },
      items: [
        {
          item: {
            id: "item-1",
            title: "useDebounce",
            description: null,
            contentType: "TEXT",
            fileUrl: null,
            fileName: null,
            fileSize: null,
            isFavorite: false,
            isPinned: true,
            createdAt: created,
            updatedAt: updated,
            itemType: {
              id: "snippet",
              name: "snippet",
              icon: "Code",
              color: "#3b82f6",
            },
            tags: [{ name: "hooks" }, { name: "react" }],
          },
        },
      ],
    });

    const result = await getCollectionDetail("user-1", "col-1");

    expect(result).toEqual({
      id: "col-1",
      name: "React Patterns",
      description: "Handy hooks",
      isFavorite: true,
      total: 30,
      items: [
        {
          id: "item-1",
          title: "useDebounce",
          description: null,
          contentType: "TEXT",
          fileUrl: null,
          fileName: null,
          fileSize: null,
          tags: ["hooks", "react"],
          isFavorite: false,
          isPinned: true,
          createdAt: created.toISOString(),
          updatedAt: updated.toISOString(),
          type: {
            id: "snippet",
            name: "snippet",
            icon: "Code",
            color: "#3b82f6",
          },
        },
      ],
    });
  });

  it("orders items pinned-first, then most-recently updated, and pages (page 1 default)", async () => {
    collectionFindFirst.mockResolvedValue({
      id: "col-1",
      name: "Empty",
      description: null,
      isFavorite: false,
      _count: { items: 0 },
      items: [],
    });

    await getCollectionDetail("user-1", "col-1");

    expect(collectionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          items: expect.objectContaining({
            orderBy: [
              { item: { isPinned: "desc" } },
              { item: { updatedAt: "desc" } },
            ],
            skip: 0,
            take: 21,
          }),
        }),
      }),
    );
  });

  it("computes the skip offset for a later page", async () => {
    collectionFindFirst.mockResolvedValue({
      id: "col-1",
      name: "Big",
      description: null,
      isFavorite: false,
      _count: { items: 60 },
      items: [],
    });

    await getCollectionDetail("user-1", "col-1", { page: 2 });

    expect(collectionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          items: expect.objectContaining({ skip: 21, take: 21 }),
        }),
      }),
    );
  });
});

describe("getCollectionsPage", () => {
  it("scopes to owner, orders newest-first, and pages (default page 1)", async () => {
    collectionFindMany.mockResolvedValue([]);
    collectionCount.mockResolvedValue(0);

    const result = await getCollectionsPage("user-1");

    expect(collectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { updatedAt: "desc" },
        skip: 0,
        take: 21,
      }),
    );
    expect(collectionCount).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(result).toEqual({ collections: [], total: 0 });
  });

  it("computes the skip offset for a later page and maps the card shape", async () => {
    collectionFindMany.mockResolvedValue([
      {
        id: "col-1",
        name: "React Patterns",
        description: null,
        isFavorite: true,
        updatedAt: new Date("2026-07-02T00:00:00.000Z"),
        defaultType: null,
        items: [
          { item: { itemType: { id: "snippet", icon: "Code", color: "#3b82f6" } } },
        ],
      },
    ]);
    collectionCount.mockResolvedValue(40);

    const result = await getCollectionsPage("user-1", { page: 2 });

    expect(collectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 21, take: 21 }),
    );
    expect(result.total).toBe(40);
    expect(result.collections[0]).toMatchObject({
      id: "col-1",
      itemCount: 1,
      accentColor: "#3b82f6",
    });
  });
});

describe("getRecentCollections", () => {
  it("takes the dashboard limit by default (no skip)", async () => {
    collectionFindMany.mockResolvedValue([]);

    await getRecentCollections("user-1");

    expect(collectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
    );
    // Not a paged read — no skip.
    expect(collectionFindMany.mock.calls[0][0]).not.toHaveProperty("skip");
  });

  it("honours a custom limit", async () => {
    collectionFindMany.mockResolvedValue([]);

    await getRecentCollections("user-1", 3);

    expect(collectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });
});

describe("getCollectionStats", () => {
  it("returns owner-scoped total and favorite counts", async () => {
    collectionCount.mockResolvedValueOnce(12).mockResolvedValueOnce(4);

    const result = await getCollectionStats("user-1");

    expect(result).toEqual({ total: 12, favorites: 4 });
    expect(collectionCount).toHaveBeenNthCalledWith(1, {
      where: { userId: "user-1" },
    });
    expect(collectionCount).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-1", isFavorite: true },
    });
  });
});
