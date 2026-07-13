import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteItem, toggleFavorite, togglePin } from "@/actions/items";

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
