import { beforeEach, describe, expect, it, vi } from "vitest";

// rankItemTypesByUsage is pure, but the module imports the Prisma singleton at
// load time — stub it. createCollection uses prisma.collection.create, so mock
// that too.
const collectionCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { collection: { create: (...args: unknown[]) => collectionCreate(...args) } },
}));

import { createCollection, rankItemTypesByUsage } from "@/lib/db/collections";

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
