// Custom filter for the command palette (cmdk). cmdk's built-in filter is a
// fuzzy *subsequence* scorer, so a short query like "test" or "git" matches
// almost every item (the letters appear in-order somewhere). This replaces it
// with a case-insensitive **substring** match plus light ranking:
//
//   - query is a prefix of the primary keyword (title/name) → strongest
//   - query is a substring of the primary keyword           → strong
//   - query is a substring of the secondary keywords        → weaker
//   - otherwise                                             → hidden (0)
//
// cmdk passes each item's `value` and its `keywords`. Callers put the item's
// title (or collection name) first in `keywords`, then type/preview after; the
// opaque `value` (an id) is intentionally not matched. Pure/client-safe.
export function commandFilter(
  _value: string,
  search: string,
  keywords?: string[],
): number {
  const q = search.trim().toLowerCase();
  if (!q) return 1;

  const kw = keywords ?? [];
  const primary = (kw[0] ?? "").toLowerCase();
  if (primary.startsWith(q)) return 1;
  if (primary.includes(q)) return 0.7;

  const secondary = kw.slice(1).join(" ").toLowerCase();
  if (secondary.includes(q)) return 0.4;

  return 0;
}
