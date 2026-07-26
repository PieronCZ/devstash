// Data fetching for the global command palette (Cmd+K). Returns a light,
// fully-searchable snapshot of the user's items and collections, fetched once on
// app load and filtered client-side (no server round-trips per keystroke).
// Scoped to the authenticated user, whose id the function receives from the caller.

import type { ContentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Max characters of an item's body kept for the palette preview line. Long
// content (a whole snippet) is truncated — the palette matches on it and shows a
// one-liner, the drawer holds the full body.
const PREVIEW_MAX = 100;

// An item as shown in the palette's Items group.
export interface SearchItem {
  id: string;
  title: string;
  preview: string | null; // short content/url/filename preview
  type: { name: string; icon: string; color: string };
}

// A collection as shown in the palette's Collections group.
export interface SearchCollection {
  id: string;
  name: string;
  itemCount: number;
}

export interface SearchData {
  items: SearchItem[];
  collections: SearchCollection[];
}

// Collapse whitespace and clip to PREVIEW_MAX chars (with an ellipsis) for the
// palette's single-line preview. Pure/testable.
export function buildPreview(value: string | null | undefined): string | null {
  if (!value) return null;
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.length > PREVIEW_MAX
    ? `${collapsed.slice(0, PREVIEW_MAX)}…`
    : collapsed;
}

// Pick the most useful preview source for an item, by content kind: TEXT → the
// body, URL → the link, FILE → the filename, falling back to the description.
// Pure/testable.
export function itemPreviewSource(row: {
  contentType: ContentType;
  content: string | null;
  url: string | null;
  fileName: string | null;
  description: string | null;
}): string | null {
  const primary =
    row.contentType === "URL"
      ? row.url
      : row.contentType === "FILE"
        ? row.fileName
        : row.content;
  return buildPreview(primary ?? row.description);
}

// A snapshot of everything the user can search from the command palette: all
// items (with a preview + resolved type) and all collections (with item counts),
// newest first. Scoped to `userId`.
export async function getSearchData(userId: string): Promise<SearchData> {
  const [items, collections] = await Promise.all([
    prisma.item.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        contentType: true,
        content: true,
        url: true,
        fileName: true,
        description: true,
        itemType: { select: { name: true, icon: true, color: true } },
      },
    }),
    prisma.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      preview: itemPreviewSource(item),
      type: item.itemType,
    })),
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      itemCount: c._count.items,
    })),
  };
}
