// Data fetching for the dashboard's items sections (pinned + recent) and the
// item stats. Reads directly from the database via Prisma. Scoped to the
// authenticated user, whose id each function receives from the caller.

import type { ContentType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SYSTEM_TYPE_ORDER } from "@/lib/item-types";
import type { CreateItemInput, UpdateItemInput } from "@/lib/validations/items";

// The item's type, resolved for the card's icon/border/label.
export interface DashboardItemType {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex
}

// Shape the ItemCard renders. Deliberately light — no `content` (which can be
// very long); the full body is fetched on click via `getItemDetail`.
export interface DashboardItem {
  id: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  fileUrl: string | null; // R2 public URL, FILE items — used for image thumbnails
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: string; // ISO
  type: DashboardItemType;
}

// What we need to select from an Item to build a DashboardItem (card).
const itemSelect = {
  id: true,
  title: true,
  description: true,
  contentType: true,
  fileUrl: true,
  isFavorite: true,
  isPinned: true,
  updatedAt: true,
  itemType: { select: { id: true, name: true, icon: true, color: true } },
  tags: { select: { name: true }, orderBy: { name: "asc" } },
} as const;

type ItemRow = {
  id: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  fileUrl: string | null;
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
    description: item.description,
    contentType: item.contentType,
    fileUrl: item.fileUrl,
    tags: item.tags.map((t) => t.name),
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    updatedAt: item.updatedAt.toISOString(),
    type: item.itemType,
  };
}

// Full item detail rendered inside the drawer — fetched on click, not with the
// card. Carries the heavy/less-common fields (content, url, file meta, language,
// collections, created date) on top of what the card already shows.
export interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  content: string | null; // TEXT items
  url: string | null; // URL items
  fileUrl: string | null; // R2 public URL, FILE items
  fileName: string | null; // FILE items
  fileSize: number | null; // bytes, FILE items
  language: string | null;
  tags: string[];
  collections: string[]; // collection names this item belongs to
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  type: DashboardItemType;
}

const itemDetailSelect = {
  id: true,
  title: true,
  description: true,
  contentType: true,
  content: true,
  url: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  language: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  itemType: { select: { id: true, name: true, icon: true, color: true } },
  tags: { select: { name: true }, orderBy: { name: "asc" } },
  collections: {
    select: { collection: { select: { name: true } } },
    orderBy: { addedAt: "asc" },
  },
} as const;

// Full detail for one item, scoped to its owner. Returns null when the item
// doesn't exist or isn't owned by `userId` (caller 404s).
export async function getItemDetail(
  userId: string,
  id: string,
): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: itemDetailSelect,
  });
  if (!item) return null;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    contentType: item.contentType,
    content: item.content,
    url: item.url,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    language: item.language,
    tags: item.tags.map((t) => t.name),
    collections: item.collections.map((c) => c.collection.name),
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    type: item.itemType,
  };
}

// Update an item's editable fields, scoped to its owner. Returns the refreshed
// ItemDetail (so the drawer can update without a second fetch), or null when the
// item doesn't exist or isn't owned by `userId`.
//
// Only fields present in `data` are written — the client sends the type-relevant
// fields, so a missing `content`/`url`/`language` is left untouched rather than
// nulled. Tags are replaced wholesale: `set: []` disconnects the existing set,
// then `connectOrCreate` re-attaches (creating any new per-user tags).
export async function updateItem(
  userId: string,
  id: string,
  data: UpdateItemInput,
): Promise<ItemDetail | null> {
  const existing = await prisma.item.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const updateData: Prisma.ItemUpdateInput = {
    title: data.title,
    description: data.description ?? null,
    tags: {
      set: [],
      connectOrCreate: data.tags.map((name) => ({
        where: { name_userId: { name, userId } },
        create: { name, user: { connect: { id: userId } } },
      })),
    },
  };

  // Type-specific fields: only overwrite when the client sent them.
  if (data.content !== undefined) updateData.content = data.content;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.language !== undefined) updateData.language = data.language;

  await prisma.item.update({ where: { id }, data: updateData });

  return getItemDetail(userId, id);
}

// Create a new item for the given user from the New Item dialog payload. Resolves
// the selected system type to its id and derives the storage `contentType` from
// it: link → URL (payload in `url`), file/image → FILE (payload in
// `fileUrl`/`fileName`/`fileSize` from a completed upload), every other creatable
// type → TEXT (payload in `content`, plus `language` for snippet/command). Only
// the fields that kind uses are persisted. Tags are created-or-connected per
// user. Returns the created ItemDetail, or null when the system type can't be
// resolved (shouldn't happen).
export async function createItem(
  userId: string,
  data: CreateItemInput,
): Promise<ItemDetail | null> {
  const itemType = await prisma.itemType.findFirst({
    where: { isSystem: true, name: data.type },
    select: { id: true },
  });
  if (!itemType) return null;

  const isLink = data.type === "link";
  const isFile = data.type === "file" || data.type === "image";
  const contentType: ContentType = isLink ? "URL" : isFile ? "FILE" : "TEXT";
  const isText = !isLink && !isFile;
  const supportsLanguage = data.type === "snippet" || data.type === "command";

  const created = await prisma.item.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      contentType,
      content: isText ? (data.content ?? null) : null,
      url: isLink ? (data.url ?? null) : null,
      fileUrl: isFile ? (data.fileUrl ?? null) : null,
      fileName: isFile ? (data.fileName ?? null) : null,
      fileSize: isFile ? (data.fileSize ?? null) : null,
      language: supportsLanguage ? (data.language ?? null) : null,
      user: { connect: { id: userId } },
      itemType: { connect: { id: itemType.id } },
      tags: {
        connectOrCreate: data.tags.map((name) => ({
          where: { name_userId: { name, userId } },
          create: { name, user: { connect: { id: userId } } },
        })),
      },
    },
    select: { id: true },
  });

  return getItemDetail(userId, created.id);
}

// The backing-file fields for one item, scoped to its owner — for the download
// proxy and delete cleanup. Returns null when the item doesn't exist, isn't owned
// by `userId`, or isn't a file-backed item.
export async function getItemFile(
  userId: string,
  id: string,
): Promise<{ fileUrl: string; fileName: string | null } | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId, contentType: "FILE" },
    select: { fileUrl: true, fileName: true },
  });
  if (!item?.fileUrl) return null;
  return { fileUrl: item.fileUrl, fileName: item.fileName };
}

// Flip an item's favorite flag, scoped to its owner. Returns the new value, or
// null when the item doesn't exist or isn't owned by `userId` (caller reports
// "not found"). `updateMany`'s owner-scoped `where` keeps the write safe even
// though we've already confirmed ownership on the read.
export async function toggleItemFavorite(
  userId: string,
  id: string,
): Promise<boolean | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { isFavorite: true },
  });
  if (!item) return null;

  const next = !item.isFavorite;
  await prisma.item.updateMany({
    where: { id, userId },
    data: { isFavorite: next },
  });
  return next;
}

// Flip an item's pinned flag, scoped to its owner. Same contract as
// `toggleItemFavorite`.
export async function toggleItemPin(
  userId: string,
  id: string,
): Promise<boolean | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { isPinned: true },
  });
  if (!item) return null;

  const next = !item.isPinned;
  await prisma.item.updateMany({
    where: { id, userId },
    data: { isPinned: next },
  });
  return next;
}

// Permanently delete an item, scoped to its owner. `deleteMany` returns a count,
// so a non-owner (or missing item) deletes nothing; returns whether a row was
// removed.
export async function deleteItem(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.item.deleteMany({ where: { id, userId } });
  return count > 0;
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

// Resolve a route param (e.g. "snippet", or the plural "snippets") to the
// canonical system-type name. Returns null for anything that isn't a system
// type so the caller can 404.
export function resolveSystemTypeName(param: string): string | null {
  const name = param.toLowerCase();
  if (SYSTEM_TYPE_ORDER.includes(name)) return name;
  // Tolerate the plural route form used in the spec (/items/snippets).
  if (name.endsWith("s") && SYSTEM_TYPE_ORDER.includes(name.slice(0, -1))) {
    return name.slice(0, -1);
  }
  return null;
}

// A resolved system item type — its display metadata for the list header.
export interface ResolvedItemType {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex
}

// Look up a system item type by its canonical name (icon/color for the header).
export async function getSystemItemType(
  name: string,
): Promise<ResolvedItemType | null> {
  return prisma.itemType.findFirst({
    where: { isSystem: true, name },
    select: { id: true, name: true, icon: true, color: true },
  });
}

// All of the given user's items of one type, newest first (pinned float to top).
export async function getItemsByType(
  userId: string,
  typeName: string,
): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, itemType: { name: typeName, isSystem: true } },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    select: itemSelect,
  });
  return items.map(toDashboardItem);
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
