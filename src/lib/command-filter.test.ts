import { describe, expect, it } from "vitest";

import { commandFilter } from "@/lib/command-filter";

describe("commandFilter", () => {
  it("returns 1 for an empty query (everything visible)", () => {
    expect(commandFilter("id", "", ["useDebounce"])).toBe(1);
    expect(commandFilter("id", "   ", ["useDebounce"])).toBe(1);
  });

  it("ranks a title prefix highest", () => {
    expect(commandFilter("id", "use", ["useDebounce", "snippet"])).toBe(1);
  });

  it("ranks a title substring below a prefix", () => {
    expect(commandFilter("id", "debounce", ["useDebounce", "snippet"])).toBe(
      0.7,
    );
  });

  it("ranks a secondary-keyword match weakest", () => {
    // query only appears in the preview/type, not the title
    expect(
      commandFilter("id", "snippet", ["useDebounce", "snippet", "the body"]),
    ).toBe(0.4);
  });

  it("hides items with no substring match (the fuzzy-subsequence problem)", () => {
    // "test" is a subsequence of "the settings" but not a substring → hidden
    expect(commandFilter("id", "test", ["the settings"])).toBe(0);
    expect(commandFilter("id", "git", ["React Patterns"])).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(commandFilter("id", "USE", ["useDebounce"])).toBe(1);
    expect(commandFilter("id", "debOUNce", ["useDebounce"])).toBe(0.7);
  });

  it("does not match against the opaque value (id)", () => {
    expect(commandFilter("clx123abc", "clx", [])).toBe(0);
  });

  it("tolerates missing keywords", () => {
    expect(commandFilter("id", "anything")).toBe(0);
  });
});
