// Pagination constants and pure helpers shared by the paginated listings
// (/items/[type], /collections, /collections/[id]) and the dashboard's fixed
// limits. Kept free of any React / Prisma imports so it can be unit-tested and
// used from both server components and the DB layer.

// Page sizes for the paginated listings.
export const ITEMS_PER_PAGE = 21;
export const COLLECTIONS_PER_PAGE = 21;

// Fixed (non-paginated) limits for the dashboard's "recent" sections.
export const DASHBOARD_COLLECTIONS_LIMIT = 6;
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10;

// A rendered pagination slot — either a page number or a gap marker.
export type PageToken = number | "ellipsis";

// Parse a raw `?page=` search-param value into a 1-based page number. Anything
// that isn't a positive integer (missing, "0", "-3", "abc", a repeated param)
// falls back to page 1.
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return 1;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

// Total number of pages for a given item count and page size. Always at least 1
// (an empty listing still shows page 1).
export function totalPages(totalItems: number, perPage: number): number {
  if (totalItems <= 0 || perPage <= 0) return 1;
  return Math.ceil(totalItems / perPage);
}

// The Prisma `skip` offset for a 1-based page.
export function pageOffset(page: number, perPage: number): number {
  return Math.max(page - 1, 0) * perPage;
}

// Build the sequence of page tokens to render: always the first and last page,
// the current page with `siblings` neighbours on each side, and "ellipsis"
// markers for larger gaps. A gap of exactly one missing page renders that page
// instead of an ellipsis (avoids the awkward "1 … 3").
export function getPageNumbers(
  current: number,
  total: number,
  siblings = 1,
): PageToken[] {
  const clampedTotal = Math.max(total, 1);
  const cur = Math.min(Math.max(current, 1), clampedTotal);

  // Collect the always-shown pages plus the sibling window, deduped + sorted.
  const shown = new Set<number>([1, clampedTotal]);
  for (let i = cur - siblings; i <= cur + siblings; i++) {
    if (i >= 1 && i <= clampedTotal) shown.add(i);
  }
  const sorted = [...shown].sort((a, b) => a - b);

  const tokens: PageToken[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap === 2) tokens.push(sorted[i - 1] + 1);
      else if (gap > 2) tokens.push("ellipsis");
    }
    tokens.push(sorted[i]);
  }
  return tokens;
}
