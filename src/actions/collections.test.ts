import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCollection } from "@/actions/collections";

// Mock the external boundaries: auth + the query layer + Next's cache helper.
// The action is a thin auth/validation/revalidate shell — the owner-scoped DB
// write lives in `@/lib/db/collections` (tested there against Prisma).
const auth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => auth() }));

const createCollectionQuery = vi.fn();
vi.mock("@/lib/db/collections", () => ({
  createCollection: (...args: unknown[]) => createCollectionQuery(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "user-1" } });
});

describe("createCollection", () => {
  const validInput = { name: "React Patterns", description: "Handy hooks" };

  it("rejects when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await createCollection(validInput);
    expect(res).toEqual({ success: false, error: "Not authenticated" });
    expect(createCollectionQuery).not.toHaveBeenCalled();
  });

  it("returns the first Zod issue when validation fails", async () => {
    const res = await createCollection({ name: "  " });
    expect(res).toEqual({ success: false, error: "Name is required" });
    expect(createCollectionQuery).not.toHaveBeenCalled();
  });

  it("passes the validated (normalized) data to the query and returns the collection", async () => {
    const collection = { id: "col-1", name: "React Patterns", description: "Handy hooks" };
    createCollectionQuery.mockResolvedValue(collection);

    const res = await createCollection({
      name: "  React Patterns  ",
      description: "Handy hooks",
    });

    expect(res).toEqual({ success: true, collection });
    expect(createCollectionQuery).toHaveBeenCalledWith("user-1", {
      // name trimmed by the schema
      name: "React Patterns",
      description: "Handy hooks",
    });
  });
});
