import { describe, expect, it } from "vitest";

import {
  COLLECTIONS_PER_PAGE,
  DASHBOARD_COLLECTIONS_LIMIT,
  DASHBOARD_RECENT_ITEMS_LIMIT,
  getPageNumbers,
  ITEMS_PER_PAGE,
  pageOffset,
  parsePageParam,
  totalPages,
  type PageToken,
} from "@/lib/pagination";

describe("pagination constants", () => {
  it("match the spec's values", () => {
    expect(ITEMS_PER_PAGE).toBe(21);
    expect(COLLECTIONS_PER_PAGE).toBe(21);
    expect(DASHBOARD_COLLECTIONS_LIMIT).toBe(6);
    expect(DASHBOARD_RECENT_ITEMS_LIMIT).toBe(10);
  });
});

describe("parsePageParam", () => {
  it("defaults to 1 when missing", () => {
    expect(parsePageParam(undefined)).toBe(1);
  });

  it("parses a positive integer string", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("1")).toBe(1);
  });

  it("falls back to 1 for non-positive, non-integer, or garbage input", () => {
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("1.5")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("")).toBe(1);
  });

  it("uses the first value when the param is repeated", () => {
    expect(parsePageParam(["4", "9"])).toBe(4);
    expect(parsePageParam(["bad", "2"])).toBe(1);
  });
});

describe("totalPages", () => {
  it("rounds up partial pages", () => {
    expect(totalPages(21, 21)).toBe(1);
    expect(totalPages(22, 21)).toBe(2);
    expect(totalPages(42, 21)).toBe(2);
    expect(totalPages(43, 21)).toBe(3);
  });

  it("returns at least 1 page for an empty listing", () => {
    expect(totalPages(0, 21)).toBe(1);
    expect(totalPages(-5, 21)).toBe(1);
  });

  it("returns 1 for a non-positive page size", () => {
    expect(totalPages(50, 0)).toBe(1);
  });
});

describe("pageOffset", () => {
  it("computes the skip offset for a 1-based page", () => {
    expect(pageOffset(1, 21)).toBe(0);
    expect(pageOffset(2, 21)).toBe(21);
    expect(pageOffset(3, 21)).toBe(42);
  });

  it("never returns a negative offset", () => {
    expect(pageOffset(0, 21)).toBe(0);
    expect(pageOffset(-3, 21)).toBe(0);
  });
});

describe("getPageNumbers", () => {
  it("lists every page when they all fit without a gap", () => {
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(getPageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("returns a single page for tiny/empty listings", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(1, 0)).toEqual([1]);
  });

  it("shows an ellipsis on the right near the start", () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, "ellipsis", 10]);
  });

  it("shows an ellipsis on the left near the end", () => {
    expect(getPageNumbers(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });

  it("shows ellipses on both sides in the middle", () => {
    expect(getPageNumbers(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });

  it("renders the single missing page instead of an ellipsis (no '1 … 3')", () => {
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("clamps an out-of-range current page", () => {
    expect(getPageNumbers(99, 5)).toEqual([1, "ellipsis", 4, 5]);
    expect(getPageNumbers(0, 5)).toEqual([1, 2, "ellipsis", 5]);
  });

  it("never duplicates a page token", () => {
    const tokens = getPageNumbers(5, 10);
    const numbers = tokens.filter((t): t is number => t !== "ellipsis");
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("respects a wider sibling window", () => {
    // current 5 ± 2 → 3..7; gap 1→3 is exactly one page (2), so it's shown
    // instead of an ellipsis; gap 7→20 gets an ellipsis.
    const tokens: PageToken[] = getPageNumbers(5, 20, 2);
    expect(tokens).toEqual([1, 2, 3, 4, 5, 6, 7, "ellipsis", 20]);
  });
});
