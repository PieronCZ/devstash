import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildPreview, getSearchData, itemPreviewSource } from "@/lib/db/search";

const itemFindMany = vi.fn();
const collectionFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findMany: (...args: unknown[]) => itemFindMany(...args),
    },
    collection: {
      findMany: (...args: unknown[]) => collectionFindMany(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildPreview", () => {
  it("returns null for empty / whitespace-only input", () => {
    expect(buildPreview(null)).toBeNull();
    expect(buildPreview(undefined)).toBeNull();
    expect(buildPreview("   \n\t ")).toBeNull();
  });

  it("collapses whitespace", () => {
    expect(buildPreview("foo   bar\n\nbaz")).toBe("foo bar baz");
  });

  it("truncates long content with an ellipsis", () => {
    const preview = buildPreview("a".repeat(200));
    expect(preview).toHaveLength(101); // 100 chars + ellipsis
    expect(preview?.endsWith("…")).toBe(true);
  });

  it("leaves short content untouched (no ellipsis)", () => {
    expect(buildPreview("short")).toBe("short");
  });
});

describe("itemPreviewSource", () => {
  const base = {
    content: null,
    url: null,
    fileName: null,
    description: null,
  };

  it("uses content for TEXT items", () => {
    expect(
      itemPreviewSource({ ...base, contentType: "TEXT", content: "the body" }),
    ).toBe("the body");
  });

  it("uses url for URL items", () => {
    expect(
      itemPreviewSource({
        ...base,
        contentType: "URL",
        url: "https://example.com",
      }),
    ).toBe("https://example.com");
  });

  it("uses fileName for FILE items", () => {
    expect(
      itemPreviewSource({ ...base, contentType: "FILE", fileName: "notes.pdf" }),
    ).toBe("notes.pdf");
  });

  it("falls back to description when the primary source is empty", () => {
    expect(
      itemPreviewSource({
        ...base,
        contentType: "TEXT",
        content: null,
        description: "a description",
      }),
    ).toBe("a description");
  });
});

describe("getSearchData", () => {
  it("scopes both queries to the owner, newest first", async () => {
    itemFindMany.mockResolvedValue([]);
    collectionFindMany.mockResolvedValue([]);

    await getSearchData("user-1");

    expect(itemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { updatedAt: "desc" },
      }),
    );
    expect(collectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { updatedAt: "desc" },
      }),
    );
  });

  it("shapes items with a resolved preview + type, and collections with counts", async () => {
    itemFindMany.mockResolvedValue([
      {
        id: "i1",
        title: "useDebounce",
        contentType: "TEXT",
        content: "export function useDebounce() {}",
        url: null,
        fileName: null,
        description: "a hook",
        itemType: { name: "snippet", icon: "Code", color: "#3b82f6" },
      },
    ]);
    collectionFindMany.mockResolvedValue([
      { id: "c1", name: "React Patterns", _count: { items: 3 } },
    ]);

    const data = await getSearchData("user-1");

    expect(data.items).toEqual([
      {
        id: "i1",
        title: "useDebounce",
        preview: "export function useDebounce() {}",
        type: { name: "snippet", icon: "Code", color: "#3b82f6" },
      },
    ]);
    expect(data.collections).toEqual([
      { id: "c1", name: "React Patterns", itemCount: 3 },
    ]);
  });
});
