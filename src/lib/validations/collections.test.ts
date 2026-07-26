import { describe, expect, it } from "vitest";

import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/lib/validations/collections";

describe("createCollectionSchema", () => {
  it("accepts a name with an optional description", () => {
    const parsed = createCollectionSchema.parse({
      name: "React Patterns",
      description: "Handy hooks",
    });
    expect(parsed).toEqual({
      name: "React Patterns",
      description: "Handy hooks",
    });
  });

  it("trims the name", () => {
    const parsed = createCollectionSchema.parse({ name: "  DevOps  " });
    expect(parsed.name).toBe("DevOps");
  });

  it("rejects an empty / whitespace-only name", () => {
    const result = createCollectionSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Name is required");
    }
  });

  it("rejects a name longer than 100 chars", () => {
    const result = createCollectionSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("coerces a blank description to null", () => {
    const parsed = createCollectionSchema.parse({
      name: "Notes",
      description: "   ",
    });
    expect(parsed.description).toBeNull();
  });

  it("allows the description to be omitted", () => {
    const parsed = createCollectionSchema.parse({ name: "Notes" });
    expect(parsed.description).toBeUndefined();
  });
});

describe("updateCollectionSchema", () => {
  it("accepts a name with an updated description", () => {
    const parsed = updateCollectionSchema.parse({
      name: "React Patterns",
      description: "Now with hooks",
    });
    expect(parsed).toEqual({
      name: "React Patterns",
      description: "Now with hooks",
    });
  });

  it("trims the name", () => {
    const parsed = updateCollectionSchema.parse({ name: "  DevOps  " });
    expect(parsed.name).toBe("DevOps");
  });

  it("rejects an empty / whitespace-only name", () => {
    const result = updateCollectionSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Name is required");
    }
  });

  it("rejects a name longer than 100 chars", () => {
    const result = updateCollectionSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("coerces a blank description to null (clears it)", () => {
    const parsed = updateCollectionSchema.parse({
      name: "Notes",
      description: "   ",
    });
    expect(parsed.description).toBeNull();
  });
});
