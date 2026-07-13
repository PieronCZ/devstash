import { describe, expect, it } from "vitest";

import { updateItemSchema } from "@/lib/validations/items";

describe("updateItemSchema", () => {
  it("accepts a minimal valid payload (title + tags)", () => {
    const res = updateItemSchema.safeParse({ title: "Hello", tags: [] });
    expect(res.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const res = updateItemSchema.safeParse({ title: "   ", tags: [] });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe("Title is required");
    }
  });

  it("trims the title", () => {
    const res = updateItemSchema.safeParse({ title: "  Padded  ", tags: [] });
    expect(res.success && res.data.title).toBe("Padded");
  });

  it("trims, drops empties, and de-duplicates tags", () => {
    const res = updateItemSchema.safeParse({
      title: "T",
      tags: ["react", " react ", "", "  ", "hooks"],
    });
    expect(res.success && res.data.tags).toEqual(["react", "hooks"]);
  });

  it("coerces an empty description/content/language to null", () => {
    const res = updateItemSchema.safeParse({
      title: "T",
      description: "   ",
      content: "",
      language: "  ",
      tags: [],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.description).toBeNull();
      expect(res.data.content).toBeNull();
      expect(res.data.language).toBeNull();
    }
  });

  it("leaves omitted type-specific fields undefined (untouched by the query)", () => {
    const res = updateItemSchema.safeParse({ title: "T", tags: [] });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.content).toBeUndefined();
      expect(res.data.url).toBeUndefined();
      expect(res.data.language).toBeUndefined();
    }
  });

  it("accepts a valid URL and coerces an empty URL to null", () => {
    const ok = updateItemSchema.safeParse({
      title: "T",
      url: "https://example.com",
      tags: [],
    });
    expect(ok.success && ok.data.url).toBe("https://example.com");

    const empty = updateItemSchema.safeParse({ title: "T", url: "", tags: [] });
    expect(empty.success && empty.data.url).toBeNull();
  });

  it("rejects an invalid URL", () => {
    const res = updateItemSchema.safeParse({
      title: "T",
      url: "not-a-url",
      tags: [],
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe("Must be a valid URL");
    }
  });

  it("does not preserve content as an empty string (trims to null)", () => {
    const res = updateItemSchema.safeParse({
      title: "T",
      content: "  const x = 1;  ",
      tags: [],
    });
    // content is not trimmed (whitespace can be significant in code), only
    // empty/whitespace-only becomes null.
    expect(res.success && res.data.content).toBe("  const x = 1;  ");
  });
});
