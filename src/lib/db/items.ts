// Data fetching for the dashboard's items sections (pinned + recent) and the
// item stats. Reads directly from the database via Prisma. Scoped to the
// authenticated user, whose id each function receives from the caller.

import type { ContentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SYSTEM_TYPE_ORDER } from "@/lib/item-types";

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

// Pinned items for the given user, newest first.
export async function getPinnedItems(userId: string): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    select: itemSelect,
  });
  return items.map(toDashboardItem);
}

// Recent (non-pinned) items for the given user, newest first.
export async function getRecentItems(
  userId: string,
  limit = 10,
): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: false },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: itemSelect,
  });
  return items.map(toDashboardItem);
}

// Total and favorite item counts for the dashboard stats.
export async function getItemStats(userId: string): Promise<{
  total: number;
  favorites: number;
}> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({
      where: { userId, isFavorite: true },
    }),
  ]);
  return { total, favorites };
}

// A system item type as shown in the sidebar's Types list.
export interface SidebarItemType {
  id: string;
  name: string; // lowercase, used for the /items/[name] route
  icon: string; // lucide icon name
  color: string; // hex
  count: number; // items of this type owned by the current user
}

// System item types with the given user's per-type item counts, for the
// sidebar's Types list. Ordered to match the product's canonical listing.
export async function getSidebarItemTypes(
  userId: string,
): Promise<SidebarItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      _count: {
        select: { items: { where: { userId } } },
      },
    },
  });

  return types
    .map((type) => ({
      id: type.id,
      name: type.name,
      icon: type.icon,
      color: type.color,
      count: type._count.items,
    }))
    .sort((a, b) => {
      const ai = SYSTEM_TYPE_ORDER.indexOf(a.name);
      const bi = SYSTEM_TYPE_ORDER.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
}
