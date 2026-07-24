import { describe, expect, it, vi } from "vitest";

// rankItemTypesByUsage is pure, but the module imports the Prisma singleton at
// load time — stub it so the test never instantiates a real client.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { rankItemTypesByUsage } from "@/lib/db/collections";

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
