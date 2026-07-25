import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createItem,
  deleteItem,
  toggleFavorite,
  togglePin,
  updateItem,
} from "@/actions/items";

// Mock the external boundaries: auth + the query layer + Next's cache helper.
// The actions are now a thin auth/validation/revalidate shell — every
// owner-scoped DB write lives in `@/lib/db/items` (tested there against Prisma).
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => auth() }));

const toggleItemFavorite = vi.fn();
const toggleItemPin = vi.fn();
const deleteItemQuery = vi.fn();
const updateItemQuery = vi.fn();
const createItemQuery = vi.fn();
const getItemFile = vi.fn();
vi.mock("@/lib/db/items", () => ({
  toggleItemFavorite: (...args: unknown[]) => toggleItemFavorite(...args),
  toggleItemPin: (...args: unknown[]) => toggleItemPin(...args),
  deleteItem: (...args: unknown[]) => deleteItemQuery(...args),
  updateItem: (...args: unknown[]) => updateItemQuery(...args),
  createItem: (...args: unknown[]) => createItemQuery(...args),
  getItemFile: (...args: unknown[]) => getItemFile(...args),
}));

// R2 boundary — asserted for the file-cleanup path, otherwise inert.
const deleteFromR2 = vi.fn();
const keyFromPublicUrl = vi.fn();
vi.mock("@/lib/r2", () => ({
  deleteFromR2: (...args: unknown[]) => deleteFromR2(...args),
  keyFromPublicUrl: (...args: unknown[]) => keyFromPublicUrl(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "user-1" } });
  // Default: items have no backing file (text/url). File tests override this.
  getItemFile.mockResolvedValue(null);
});

describe("toggleFavorite", () => {
  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await toggleFavorite("item-1");
    expect(res).toEqual({ success: false, error: "Not authenticated" });
    expect(toggleItemFavorite).not.toHaveBeenCalled();
  });

  it("returns not found when the query reports no owned item", async () => {
    toggleItemFavorite.mockResolvedValue(null);
    const res = await toggleFavorite("item-1");
    expect(res).toEqual({ success: false, error: "Item not found" });
  });

  it("returns the new flag and delegates the owner-scoped write", async () => {
    toggleItemFavorite.mockResolvedValue(true);

    const res = await toggleFavorite("item-1");

    expect(res).toEqual({ success: true, isFavorite: true });
    expect(toggleItemFavorite).toHaveBeenCalledWith("user-1", "item-1");
  });

  it("surfaces a flip to false (not treated as not-found)", async () => {
    toggleItemFavorite.mockResolvedValue(false);

    const res = await toggleFavorite("item-1");

    expect(res).toEqual({ success: true, isFavorite: false });
  });
});

describe("togglePin", () => {
  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(undefined);
    const res = await togglePin("item-1");
    expect(res).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns not found when the query reports no owned item", async () => {
    toggleItemPin.mockResolvedValue(null);
    const res = await togglePin("item-1");
    expect(res).toEqual({ success: false, error: "Item not found" });
  });

  it("returns the new flag and delegates the owner-scoped write", async () => {
    toggleItemPin.mockResolvedValue(true);

    const res = await togglePin("item-1");

    expect(res).toEqual({ success: true, isPinned: true });
    expect(toggleItemPin).toHaveBeenCalledWith("user-1", "item-1");
  });

  it("surfaces a flip to false (not treated as not-found)", async () => {
    toggleItemPin.mockResolvedValue(false);

    const res = await togglePin("item-1");

    expect(res).toEqual({ success: true, isPinned: false });
  });
});

describe("deleteItem", () => {
  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await deleteItem("item-1");
    expect(res).toEqual({ success: false, error: "Not authenticated" });
    expect(deleteItemQuery).not.toHaveBeenCalled();
  });

  it("returns not found when nothing was deleted", async () => {
    deleteItemQuery.mockResolvedValue(false);
    const res = await deleteItem("item-1");
    expect(res).toEqual({ success: false, error: "Item not found" });
  });

  it("delegates the owner-scoped delete and reports success", async () => {
    deleteItemQuery.mockResolvedValue(true);

    const res = await deleteItem("item-1");

    expect(res).toEqual({ success: true });
    expect(deleteItemQuery).toHaveBeenCalledWith("user-1", "item-1");
  });

  it("does not touch R2 for a text/url item", async () => {
    deleteItemQuery.mockResolvedValue(true);

    await deleteItem("item-1");

    expect(getItemFile).toHaveBeenCalledWith("user-1", "item-1");
    expect(deleteFromR2).not.toHaveBeenCalled();
  });

  it("removes the backing R2 object for a file item", async () => {
    getItemFile.mockResolvedValue({
      fileUrl: "https://cdn.example.com/uploads/user-1/abc.pdf",
      fileName: "abc.pdf",
    });
    keyFromPublicUrl.mockReturnValue("uploads/user-1/abc.pdf");
    deleteItemQuery.mockResolvedValue(true);

    const res = await deleteItem("item-1");

    expect(res).toEqual({ success: true });
    expect(deleteFromR2).toHaveBeenCalledWith("uploads/user-1/abc.pdf");
  });

  it("does not delete from R2 when nothing was removed from the DB", async () => {
    getItemFile.mockResolvedValue({
      fileUrl: "https://cdn.example.com/uploads/user-1/abc.pdf",
      fileName: "abc.pdf",
    });
    deleteItemQuery.mockResolvedValue(false);

    const res = await deleteItem("item-1");

    expect(res).toEqual({ success: false, error: "Item not found" });
    expect(deleteFromR2).not.toHaveBeenCalled();
  });

  it("still reports success when R2 cleanup fails (best-effort)", async () => {
    getItemFile.mockResolvedValue({
      fileUrl: "https://cdn.example.com/uploads/user-1/abc.pdf",
      fileName: "abc.pdf",
    });
    keyFromPublicUrl.mockReturnValue("uploads/user-1/abc.pdf");
    deleteItemQuery.mockResolvedValue(true);
    deleteFromR2.mockRejectedValue(new Error("R2 down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await deleteItem("item-1");

    expect(res).toEqual({ success: true });
    errorSpy.mockRestore();
  });
});

describe("updateItem", () => {
  const validInput = { title: "New title", tags: ["a", "b"] };

  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await updateItem("item-1", validInput);
    expect(res).toEqual({ success: false, error: "Not authenticated" });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("returns the first Zod issue when validation fails", async () => {
    const res = await updateItem("item-1", { title: "  ", tags: [] });
    expect(res).toEqual({ success: false, error: "Title is required" });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("returns not found when the query reports no owned item", async () => {
    updateItemQuery.mockResolvedValue(null);
    const res = await updateItem("item-1", validInput);
    expect(res).toEqual({ success: false, error: "Item not found" });
  });

  it("passes the validated (normalized) data to the query and returns the item", async () => {
    const detail = { id: "item-1", title: "New title" };
    updateItemQuery.mockResolvedValue(detail);

    const res = await updateItem("item-1", {
      title: "New title",
      tags: ["a", " a ", "", "b"],
    });

    expect(res).toEqual({ success: true, item: detail });
    expect(updateItemQuery).toHaveBeenCalledWith("user-1", "item-1", {
      title: "New title",
      // tags normalized by the schema: trimmed, de-duplicated, empties dropped.
      tags: ["a", "b"],
    });
  });

  it("rejects an invalid URL before touching the query", async () => {
    const res = await updateItem("item-1", {
      title: "T",
      url: "not-a-url",
      tags: [],
    });
    expect(res).toEqual({ success: false, error: "Must be a valid URL" });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });
});

describe("createItem", () => {
  const validInput = { type: "snippet", title: "New snippet", tags: ["a"] };

  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await createItem(validInput);
    expect(res).toEqual({ success: false, error: "Not authenticated" });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("returns the first Zod issue when validation fails", async () => {
    const res = await createItem({ type: "snippet", title: "  ", tags: [] });
    expect(res).toEqual({ success: false, error: "Title is required" });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("requires a URL for link items before touching the query", async () => {
    const res = await createItem({ type: "link", title: "Docs", tags: [] });
    expect(res).toEqual({ success: false, error: "URL is required" });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("returns an error when the query can't create the item", async () => {
    createItemQuery.mockResolvedValue(null);
    const res = await createItem(validInput);
    expect(res).toEqual({ success: false, error: "Could not create item" });
  });

  it("passes the validated (normalized) data to the query and returns the item", async () => {
    const detail = { id: "new-1", title: "New snippet" };
    createItemQuery.mockResolvedValue(detail);

    const res = await createItem({
      type: "snippet",
      title: "New snippet",
      tags: ["a", " a ", "", "b"],
    });

    expect(res).toEqual({ success: true, item: detail });
    expect(createItemQuery).toHaveBeenCalledWith("user-1", {
      type: "snippet",
      title: "New snippet",
      // tags normalized by the schema: trimmed, de-duplicated, empties dropped.
      tags: ["a", "b"],
      // collectionIds defaults to an empty array when omitted.
      collectionIds: [],
    });
  });

  it("normalizes and forwards collectionIds to the query", async () => {
    const detail = { id: "new-1", title: "New snippet" };
    createItemQuery.mockResolvedValue(detail);

    await createItem({
      type: "snippet",
      title: "New snippet",
      tags: [],
      collectionIds: ["c1", " c1 ", "", "c2"],
    });

    expect(createItemQuery).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        // trimmed, de-duplicated, empties dropped.
        collectionIds: ["c1", "c2"],
      }),
    );
  });
});
