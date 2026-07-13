import { describe, expect, it } from "vitest";

import { PRO_TYPES, SYSTEM_TYPE_ORDER } from "@/lib/item-types";

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
