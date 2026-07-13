import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteItem,
  toggleFavorite,
  togglePin,
  updateItem,
} from "@/actions/items";

// Mock the external boundaries: auth + Prisma + Next's cache helper.
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => auth() }));

const findFirst = vi.fn();
const updateMany = vi.fn();
const deleteMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  },
}));

// The update action delegates the owner-scoped write to the query layer.
const updateItemQuery = vi.fn();
vi.mock("@/lib/db/items", () => ({
  updateItem: (...args: unknown[]) => updateItemQuery(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "user-1" } });
});

describe("toggleFavorite", () => {
  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await toggleFavorite("item-1");
    expect(res).toEqual({ success: false, error: "Not authenticated" });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns not found when the item isn't the user's", async () => {
    findFirst.mockResolvedValue(null);
    const res = await toggleFavorite("item-1");
    expect(res).toEqual({ success: false, error: "Item not found" });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("flips false to true and scopes the write to the owner", async () => {
    findFirst.mockResolvedValue({ isFavorite: false });
    updateMany.mockResolvedValue({ count: 1 });

    const res = await toggleFavorite("item-1");

    expect(res).toEqual({ success: true, isFavorite: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isFavorite: true },
    });
  });

  it("flips true to false", async () => {
    findFirst.mockResolvedValue({ isFavorite: true });
    updateMany.mockResolvedValue({ count: 1 });

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

  it("returns not found when the item isn't the user's", async () => {
    findFirst.mockResolvedValue(null);
    const res = await togglePin("item-1");
    expect(res).toEqual({ success: false, error: "Item not found" });
  });

  it("flips the pinned flag and scopes the write", async () => {
    findFirst.mockResolvedValue({ isPinned: false });
    updateMany.mockResolvedValue({ count: 1 });

    const res = await togglePin("item-1");

    expect(res).toEqual({ success: true, isPinned: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { isPinned: true },
    });
  });
});

describe("deleteItem", () => {
  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await deleteItem("item-1");
    expect(res).toEqual({ success: false, error: "Not authenticated" });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("returns not found when nothing was deleted", async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    const res = await deleteItem("item-1");
    expect(res).toEqual({ success: false, error: "Item not found" });
  });

  it("deletes scoped to the owner and reports success", async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    const res = await deleteItem("item-1");

    expect(res).toEqual({ success: true });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
    });
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
