import { describe, expect, it } from "vitest";

import {
  PRO_TYPES,
  resolveCreatableType,
  SYSTEM_TYPE_ORDER,
} from "@/lib/item-types";

describe("SYSTEM_TYPE_ORDER", () => {
  it("lists the seven system types in canonical order", () => {
    expect([...SYSTEM_TYPE_ORDER]).toEqual([
      "snippet",
      "prompt",
      "command",
      "note",
      "link",
      "file",
      "image",
    ]);
  });

  it("contains no duplicates", () => {
    expect(new Set(SYSTEM_TYPE_ORDER).size).toBe(SYSTEM_TYPE_ORDER.length);
  });
});

describe("PRO_TYPES", () => {
  it("gates only file and image behind Pro", () => {
    expect(PRO_TYPES.has("file")).toBe(true);
    expect(PRO_TYPES.has("image")).toBe(true);
    expect(PRO_TYPES.has("snippet")).toBe(false);
  });

  it("only contains members of the system type list", () => {
    for (const type of PRO_TYPES) {
      expect(SYSTEM_TYPE_ORDER).toContain(type);
    }
  });
});

describe("resolveCreatableType", () => {
  it("resolves the singular creatable type names", () => {
    expect(resolveCreatableType("snippet")).toBe("snippet");
    expect(resolveCreatableType("link")).toBe("link");
  });

  it("resolves the plural route form", () => {
    expect(resolveCreatableType("snippets")).toBe("snippet");
    expect(resolveCreatableType("commands")).toBe("command");
  });

  it("is case-insensitive", () => {
    expect(resolveCreatableType("Prompts")).toBe("prompt");
  });

  it("returns null for the Pro-only file/image types", () => {
    expect(resolveCreatableType("file")).toBeNull();
    expect(resolveCreatableType("images")).toBeNull();
  });

  it("returns null for unknown params or nullish input", () => {
    expect(resolveCreatableType("bogus")).toBeNull();
    expect(resolveCreatableType("")).toBeNull();
    expect(resolveCreatableType(null)).toBeNull();
    expect(resolveCreatableType(undefined)).toBeNull();
  });
});
