import { beforeEach, describe, expect, it, vi } from "vitest";

import { getItemDetail } from "@/lib/db/items";

const findFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findFirst: (...args: unknown[]) => findFirst(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getItemDetail", () => {
  it("scopes the lookup to the owner", async () => {
    findFirst.mockResolvedValue(null);

    await getItemDetail("user-1", "item-1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
  });

  it("returns null when the item isn't found / not owned", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getItemDetail("user-1", "missing")).toBeNull();
  });

  it("flattens nested collections and tags and serializes dates", async () => {
    const created = new Date("2025-03-12T10:00:00.000Z");
    const updated = new Date("2025-07-01T08:30:00.000Z");
    findFirst.mockResolvedValue({
      id: "item-1",
      title: "useDebounce hook",
      description: "Debounce any fast-changing value.",
      contentType: "TEXT",
      content: "export function useDebounce() {}",
      url: null,
      fileName: null,
      fileSize: null,
      language: "typescript",
      isFavorite: true,
      isPinned: false,
      createdAt: created,
      updatedAt: updated,
      itemType: { id: "t1", name: "snippet", icon: "Code", color: "#3b82f6" },
      tags: [{ name: "hooks" }, { name: "react" }],
      collections: [
        { collection: { name: "React Patterns" } },
        { collection: { name: "Interview Prep" } },
      ],
    });

    const detail = await getItemDetail("user-1", "item-1");

    expect(detail).toEqual({
      id: "item-1",
      title: "useDebounce hook",
      description: "Debounce any fast-changing value.",
      contentType: "TEXT",
      content: "export function useDebounce() {}",
      url: null,
      fileName: null,
      fileSize: null,
      language: "typescript",
      tags: ["hooks", "react"],
      collections: ["React Patterns", "Interview Prep"],
      isFavorite: true,
      isPinned: false,
      createdAt: "2025-03-12T10:00:00.000Z",
      updatedAt: "2025-07-01T08:30:00.000Z",
      type: { id: "t1", name: "snippet", icon: "Code", color: "#3b82f6" },
    });
  });

  it("handles items with no tags or collections", async () => {
    findFirst.mockResolvedValue({
      id: "item-2",
      title: "A lone note",
      description: null,
      contentType: "TEXT",
      content: "jot",
      url: null,
      fileName: null,
      fileSize: null,
      language: null,
      isFavorite: false,
      isPinned: false,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
      itemType: { id: "t2", name: "note", icon: "StickyNote", color: "#fde047" },
      tags: [],
      collections: [],
    });

    const detail = await getItemDetail("user-1", "item-2");

    expect(detail?.tags).toEqual([]);
    expect(detail?.collections).toEqual([]);
    expect(detail?.description).toBeNull();
  });
});
