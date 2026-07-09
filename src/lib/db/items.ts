// Data fetching for the dashboard's items sections (pinned + recent) and the
// item stats. Reads directly from the database via Prisma. Scoped to the demo
// user until auth is wired up (then swap DEMO_EMAIL for the session user's id).

import type { ContentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Placeholder identity — the seed creates this user. Replace with the
// authenticated session user once NextAuth is in place.
const DEMO_EMAIL = "demo@devstash.io";

// The item's type, resolved for the card's icon/border/label.
export interface DashboardItemType {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex
}

// Shape the ItemCard renders.
export interface DashboardItem {
  id: string;
  title: string;
  contentType: ContentType;
  content: string | null; // TEXT items
  url: string | null; // URL items
  fileName: string | null; // FILE items
  fileSize: number | null; // bytes, FILE items
  language: string | null;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: string; // ISO
  type: DashboardItemType;
}

// What we need to select from an Item to build a DashboardItem.
const itemSelect = {
  id: true,
  title: true,
  contentType: true,
  content: true,
  url: true,
  fileName: true,
  fileSize: true,
  language: true,
  isFavorite: true,
  isPinned: true,
  updatedAt: true,
  itemType: { select: { id: true, name: true, icon: true, color: true } },
  tags: { select: { name: true }, orderBy: { name: "asc" } },
} as const;

type ItemRow = {
  id: string;
  title: string;
  contentType: ContentType;
  content: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  language: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: Date;
  itemType: { id: string; name: string; icon: string; color: string };
  tags: { name: string }[];
};

function toDashboardItem(item: ItemRow): DashboardItem {
  return {
    id: item.id,
    title: item.title,
    contentType: item.contentType,
    content: item.content,
    url: item.url,
    fileName: item.fileName,
    fileSize: item.fileSize,
    language: item.language,
    tags: item.tags.map((t) => t.name),
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    updatedAt: item.updatedAt.toISOString(),
    type: item.itemType,
  };
}

// Pinned items for the current (demo) user, newest first.
export async function getPinnedItems(): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { user: { email: DEMO_EMAIL }, isPinned: true },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });
  return items.map(toDashboardItem);
}

// Recent (non-pinned) items for the current (demo) user, newest first.
export async function getRecentItems(limit = 10): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { user: { email: DEMO_EMAIL }, isPinned: false },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: itemSelect,
  });
  return items.map(toDashboardItem);
}

// Total and favorite item counts for the dashboard stats.
export async function getItemStats(): Promise<{
  total: number;
  favorites: number;
}> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { user: { email: DEMO_EMAIL } } }),
    prisma.item.count({
      where: { user: { email: DEMO_EMAIL }, isFavorite: true },
    }),
  ]);
  return { total, favorites };
}
