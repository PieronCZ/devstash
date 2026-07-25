import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createItem,
  deleteItem,
  getItemDetail,
  getItemFile,
  toggleItemFavorite,
  toggleItemPin,
  updateItem,
} from "@/lib/db/items";

const findFirst = vi.fn();
const updateMany = vi.fn();
const deleteMany = vi.fn();
const create = vi.fn();
const update = vi.fn();
const itemTypeFindFirst = vi.fn();
const collectionFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
    },
    itemType: {
      findFirst: (...args: unknown[]) => itemTypeFindFirst(...args),
    },
    collection: {
      findMany: (...args: unknown[]) => collectionFindMany(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no collections requested/owned unless a test overrides it.
  collectionFindMany.mockResolvedValue([]);
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
      fileUrl: null,
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
        { collection: { id: "c1", name: "React Patterns" } },
        { collection: { id: "c2", name: "Interview Prep" } },
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
      fileUrl: null,
      fileName: null,
      fileSize: null,
      language: "typescript",
      tags: ["hooks", "react"],
      collections: [
        { id: "c1", name: "React Patterns" },
        { id: "c2", name: "Interview Prep" },
      ],
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
      fileUrl: null,
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

describe("toggleItemFavorite", () => {
  it("returns null when the item isn't found / not owned", async () => {
    findFirst.mockResolvedValue(null);
    expect(await toggleItemFavorite("user-1", "item-1")).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("flips false to true and scopes both the read and write to the owner", async () => {
    findFirst.mockResolvedValue({ isFavorite: false });
    updateMany.mockResolvedValue({ count: 1 });

    expect(await toggleItemFavorite("user-1", "item-1")).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      select: { isFavorite: true },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isFavorite: true },
    });
  });

  it("flips true to false", async () => {
    findFirst.mockResolvedValue({ isFavorite: true });
    updateMany.mockResolvedValue({ count: 1 });

    expect(await toggleItemFavorite("user-1", "item-1")).toBe(false);
  });
});

describe("toggleItemPin", () => {
  it("returns null when the item isn't found / not owned", async () => {
    findFirst.mockResolvedValue(null);
    expect(await toggleItemPin("user-1", "item-1")).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("flips the pinned flag and scopes the write to the owner", async () => {
    findFirst.mockResolvedValue({ isPinned: false });
    updateMany.mockResolvedValue({ count: 1 });

    expect(await toggleItemPin("user-1", "item-1")).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isPinned: true },
    });
  });
});

describe("deleteItem", () => {
  it("returns false when nothing was deleted (missing / not owned)", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    expect(await deleteItem("user-1", "item-1")).toBe(false);
  });

  it("deletes scoped to the owner and returns true", async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    expect(await deleteItem("user-1", "item-1")).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
    });
  });
});

describe("createItem", () => {
  // Minimal detail row returned by the getItemDetail re-fetch after create.
  const detailRow = {
    id: "new-1",
    title: "T",
    description: null,
    contentType: "TEXT",
    content: null,
    url: null,
    fileName: null,
    fileSize: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    itemType: { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" },
    tags: [],
    collections: [],
  };

  it("returns null when the system type can't be resolved", async () => {
    itemTypeFindFirst.mockResolvedValue(null);

    const res = await createItem("user-1", {
      type: "snippet",
      title: "T",
      tags: [],
      collectionIds: [],
    });

    expect(res).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("resolves the type by name scoped to system types", async () => {
    itemTypeFindFirst.mockResolvedValue({ id: "type-1" });
    create.mockResolvedValue({ id: "new-1" });
    findFirst.mockResolvedValue(detailRow);

    await createItem("user-1", {
      type: "note",
      title: "T",
      tags: [],
      collectionIds: [],
    });

    expect(itemTypeFindFirst).toHaveBeenCalledWith({
      where: { isSystem: true, name: "note" },
      select: { id: true },
    });
  });

  it("creates a snippet as TEXT with content + language, url null", async () => {
    itemTypeFindFirst.mockResolvedValue({ id: "type-1" });
    create.mockResolvedValue({ id: "new-1" });
    findFirst.mockResolvedValue(detailRow);

    await createItem("user-1", {
      type: "snippet",
      title: "useDebounce",
      description: "desc",
      content: "export const x = 1;",
      language: "typescript",
      tags: ["react", "hooks"],
      collectionIds: [],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "useDebounce",
          description: "desc",
          contentType: "TEXT",
          content: "export const x = 1;",
          url: null,
          language: "typescript",
          user: { connect: { id: "user-1" } },
          itemType: { connect: { id: "type-1" } },
          tags: {
            connectOrCreate: [
              {
                where: { name_userId: { name: "react", userId: "user-1" } },
                create: { name: "react", user: { connect: { id: "user-1" } } },
              },
              {
                where: { name_userId: { name: "hooks", userId: "user-1" } },
                create: { name: "hooks", user: { connect: { id: "user-1" } } },
              },
            ],
          },
        }),
      }),
    );
  });

  it("creates a link as URL with url set, content + language null", async () => {
    itemTypeFindFirst.mockResolvedValue({ id: "type-2" });
    create.mockResolvedValue({ id: "new-2" });
    findFirst.mockResolvedValue(detailRow);

    await createItem("user-1", {
      type: "link",
      title: "Docs",
      url: "https://example.com",
      tags: [],
      collectionIds: [],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentType: "URL",
          url: "https://example.com",
          content: null,
          language: null,
        }),
      }),
    );
  });

  it("does not set language for non-snippet/command text types", async () => {
    itemTypeFindFirst.mockResolvedValue({ id: "type-3" });
    create.mockResolvedValue({ id: "new-3" });
    findFirst.mockResolvedValue(detailRow);

    await createItem("user-1", {
      type: "prompt",
      title: "P",
      content: "body",
      // language is not a prompt field — even if present it must be dropped.
      language: "typescript",
      tags: [],
      collectionIds: [],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentType: "TEXT",
          content: "body",
          language: null,
        }),
      }),
    );
  });

  it("re-fetches the created item as ItemDetail", async () => {
    itemTypeFindFirst.mockResolvedValue({ id: "type-1" });
    create.mockResolvedValue({ id: "new-1" });
    findFirst.mockResolvedValue(detailRow);

    const detail = await createItem("user-1", {
      type: "snippet",
      title: "T",
      tags: [],
      collectionIds: [],
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "new-1", userId: "user-1" } }),
    );
    expect(detail?.id).toBe("new-1");
  });

  it.each(["file", "image"] as const)(
    "creates a %s as FILE with file meta set, content/url/language null",
    async (type) => {
      itemTypeFindFirst.mockResolvedValue({ id: "type-f" });
      create.mockResolvedValue({ id: "new-f" });
      findFirst.mockResolvedValue(detailRow);

      await createItem("user-1", {
        type,
        title: "My upload",
        fileUrl: "https://cdn.example.com/uploads/user-1/abc.png",
        fileName: "abc.png",
        fileSize: 1234,
        tags: [],
        collectionIds: [],
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentType: "FILE",
            fileUrl: "https://cdn.example.com/uploads/user-1/abc.png",
            fileName: "abc.png",
            fileSize: 1234,
            content: null,
            url: null,
            language: null,
          }),
        }),
      );
    },
  );

  it("connects only the collections the user actually owns", async () => {
    itemTypeFindFirst.mockResolvedValue({ id: "type-1" });
    create.mockResolvedValue({ id: "new-1" });
    findFirst.mockResolvedValue(detailRow);
    // The client sent three ids but only two belong to the user.
    collectionFindMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);

    await createItem("user-1", {
      type: "snippet",
      title: "T",
      tags: [],
      collectionIds: ["c1", "c2", "c3-not-owned"],
    });

    expect(collectionFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { in: ["c1", "c2", "c3-not-owned"] } },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collections: {
            create: [
              { collection: { connect: { id: "c1" } } },
              { collection: { connect: { id: "c2" } } },
            ],
          },
        }),
      }),
    );
  });

  it("skips the ownership query and connects nothing when no collections are requested", async () => {
    itemTypeFindFirst.mockResolvedValue({ id: "type-1" });
    create.mockResolvedValue({ id: "new-1" });
    findFirst.mockResolvedValue(detailRow);

    await createItem("user-1", {
      type: "snippet",
      title: "T",
      tags: [],
      collectionIds: [],
    });

    expect(collectionFindMany).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ collections: { create: [] } }),
      }),
    );
  });
});

describe("updateItem", () => {
  // Full row so both the existence check and the getItemDetail re-fetch (which
  // maps tags/collections) are satisfied by the shared findFirst mock.
  const detailRow = {
    id: "item-1",
    title: "T",
    description: null,
    contentType: "TEXT",
    content: null,
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    itemType: { id: "type-1", name: "note", icon: "StickyNote", color: "#fde047" },
    tags: [],
    collections: [],
  };

  beforeEach(() => {
    // Item exists / is owned, and getItemDetail re-fetch returns a full row.
    findFirst.mockResolvedValue(detailRow);
    update.mockResolvedValue({ id: "item-1" });
  });

  it("returns null when the item isn't found / not owned", async () => {
    findFirst.mockResolvedValue(null);
    expect(
      await updateItem("user-1", "item-1", { title: "T", tags: [] }),
    ).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("reconciles membership when collectionIds is present (clear + re-attach owned)", async () => {
    collectionFindMany.mockResolvedValue([{ id: "c2" }]);

    await updateItem("user-1", "item-1", {
      title: "T",
      tags: [],
      collectionIds: ["c2", "c9-not-owned"],
    });

    expect(collectionFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { in: ["c2", "c9-not-owned"] } },
      select: { id: true },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          collections: {
            deleteMany: {},
            create: [{ collection: { connect: { id: "c2" } } }],
          },
        }),
      }),
    );
  });

  it("clears all memberships when collectionIds is present but empty", async () => {
    await updateItem("user-1", "item-1", {
      title: "T",
      tags: [],
      collectionIds: [],
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collections: { deleteMany: {}, create: [] },
        }),
      }),
    );
  });

  it("leaves membership untouched when collectionIds is omitted", async () => {
    await updateItem("user-1", "item-1", { title: "T", tags: [] });

    expect(collectionFindMany).not.toHaveBeenCalled();
    const call = update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data).not.toHaveProperty("collections");
  });
});

describe("getItemFile", () => {
  it("scopes the lookup to the owner and FILE items", async () => {
    findFirst.mockResolvedValue(null);

    await getItemFile("user-1", "item-1");

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1", contentType: "FILE" },
      select: { fileUrl: true, fileName: true },
    });
  });

  it("returns null when the item isn't found / not a file", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getItemFile("user-1", "missing")).toBeNull();
  });

  it("returns null when a file row somehow has no fileUrl", async () => {
    findFirst.mockResolvedValue({ fileUrl: null, fileName: "x.pdf" });
    expect(await getItemFile("user-1", "item-1")).toBeNull();
  });

  it("returns the file url and name for a file item", async () => {
    findFirst.mockResolvedValue({
      fileUrl: "https://cdn.example.com/uploads/user-1/abc.pdf",
      fileName: "abc.pdf",
    });

    expect(await getItemFile("user-1", "item-1")).toEqual({
      fileUrl: "https://cdn.example.com/uploads/user-1/abc.pdf",
      fileName: "abc.pdf",
    });
  });
});
