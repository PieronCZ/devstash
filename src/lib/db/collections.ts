// Data fetching for the dashboard's collections section.
// Reads directly from the database via Prisma. Scoped to the authenticated
// user, whose id each function receives from the caller.

import { prisma } from "@/lib/prisma";
import {
  itemSelect,
  toDashboardItem,
  type DashboardItem,
} from "@/lib/db/items";
import {
  COLLECTIONS_PER_PAGE,
  DASHBOARD_COLLECTIONS_LIMIT,
  ITEMS_PER_PAGE,
  pageOffset,
} from "@/lib/pagination";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/lib/validations/collections";

// A newly created collection, as returned to the create action's caller.
export interface CreatedCollection {
  id: string;
  name: string;
  description: string | null;
}

// Create a collection for the given user. New collections start empty (no items,
// no default type); name is required, description optional. Returns the created
// row's core fields.
export async function createCollection(
  userId: string,
  data: CreateCollectionInput,
): Promise<CreatedCollection> {
  const created = await prisma.collection.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      user: { connect: { id: userId } },
    },
    select: { id: true, name: true, description: true },
  });
  return created;
}

// Update a collection's metadata, scoped to its owner. Uses `updateMany` with an
// owner-scoped `where` so a non-owner (or missing collection) writes nothing —
// reported to the caller as `null` (→ "not found") rather than mutated. The edit
// form always submits both fields, so both are always written. Returns the
// refreshed core fields.
export async function updateCollection(
  userId: string,
  collectionId: string,
  data: UpdateCollectionInput,
): Promise<CreatedCollection | null> {
  const result = await prisma.collection.updateMany({
    where: { id: collectionId, userId },
    data: {
      name: data.name,
      description: data.description ?? null,
    },
  });
  if (result.count === 0) return null;

  return prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true, name: true, description: true },
  });
}

// Permanently delete a collection, scoped to its owner. Returns whether a row was
// removed (false when not found or not owned). The `ItemCollection` join has
// `onDelete: Cascade`, so this removes only the join rows — the items themselves
// are left intact, they simply no longer belong to this collection.
export async function deleteCollection(
  userId: string,
  collectionId: string,
): Promise<boolean> {
  const result = await prisma.collection.deleteMany({
    where: { id: collectionId, userId },
  });
  return result.count > 0;
}

// A collection as offered in the item forms' collection picker.
export interface CollectionOption {
  id: string;
  name: string;
}

// All of the given user's collections (id + name), alphabetical — for the
// collection picker in the New Item dialog and the drawer edit form.
export async function getUserCollections(
  userId: string,
): Promise<CollectionOption[]> {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

// A distinct item type present in a collection, for the little icon chips.
export interface CollectionType {
  id: string;
  icon: string; // lucide icon name
  color: string; // hex
}

// Shape the CollectionCard renders.
export interface DashboardCollection {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  updatedAt: string; // ISO
  accentColor: string; // most-used type's color; drives the card's top border
  types: CollectionType[]; // distinct types, most-used first
}

// Rank the distinct item types across a collection's items by usage, most-used
// first. Each element wraps an `itemType` (via the ItemCollection join's `item`);
// returns the deduped itemType objects in descending count order.
export function rankItemTypesByUsage<T extends { id: string }>(
  items: readonly { item: { itemType: T } }[],
): T[] {
  const counts = new Map<string, { type: T; count: number }>();
  for (const { item } of items) {
    const t = item.itemType;
    const entry = counts.get(t.id);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(t.id, { type: t, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((r) => r.type);
}

// What we select to build a DashboardCollection (card): the core fields plus
// the default type and each item's type (for the usage ranking / accent color).
const collectionCardInclude = {
  defaultType: { select: { id: true, icon: true, color: true } },
  items: {
    select: {
      item: {
        select: {
          itemType: { select: { id: true, icon: true, color: true } },
        },
      },
    },
  },
} as const;

type CollectionCardRow = {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  updatedAt: Date;
  defaultType: { id: string; icon: string; color: string } | null;
  items: { item: { itemType: { id: string; icon: string; color: string } } }[];
};

// Map a fetched collection row (with the card include) to the card shape.
function toDashboardCollection(
  collection: CollectionCardRow,
): DashboardCollection {
  // Most-used type first. Fall back to the default type for empty collections.
  const ranked = rankItemTypesByUsage(collection.items);
  const types: CollectionType[] =
    ranked.length > 0
      ? ranked
      : collection.defaultType
        ? [collection.defaultType]
        : [];

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    itemCount: collection.items.length,
    updatedAt: collection.updatedAt.toISOString(),
    accentColor: types[0]?.color ?? "currentColor",
    types,
  };
}

// Recent collections for the given user, newest first — the dashboard's fixed
// grid (defaults to DASHBOARD_COLLECTIONS_LIMIT). Only fetches `limit` rows.
export async function getRecentCollections(
  userId: string,
  limit = DASHBOARD_COLLECTIONS_LIMIT,
): Promise<DashboardCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: collectionCardInclude,
  });
  return collections.map(toDashboardCollection);
}

// One page of the given user's collections, newest first, plus the total count
// for the pager. Only the page's rows are fetched (skip/take).
export async function getCollectionsPage(
  userId: string,
  {
    page = 1,
    perPage = COLLECTIONS_PER_PAGE,
  }: { page?: number; perPage?: number } = {},
): Promise<{ collections: DashboardCollection[]; total: number }> {
  const [collections, total] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: pageOffset(page, perPage),
      take: perPage,
      include: collectionCardInclude,
    }),
    prisma.collection.count({ where: { userId } }),
  ]);
  return { collections: collections.map(toDashboardCollection), total };
}

// Total and favorite collection counts for the dashboard stats — cheap counts
// instead of deriving them from a fetched-everything list.
export async function getCollectionStats(userId: string): Promise<{
  total: number;
  favorites: number;
}> {
  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({ where: { userId, isFavorite: true } }),
  ]);
  return { total, favorites };
}

// One collection plus one page of the items it holds, for the /collections/[id]
// detail page.
export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  isFavorite: boolean;
  items: DashboardItem[]; // this page's items — pinned first, then most-recent
  total: number; // total items in the collection, for the pager
}

// Full detail for one collection, scoped to its owner: its core fields plus one
// page of the items it holds (as card shapes) and the total item count. Items
// float pinned to the top, then order by most-recently updated — matching the
// type listings. Only the page's items are fetched (skip/take); the total comes
// from a relation `_count`. Returns null when the collection doesn't exist or
// isn't owned by `userId` (caller 404s).
export async function getCollectionDetail(
  userId: string,
  collectionId: string,
  {
    page = 1,
    perPage = ITEMS_PER_PAGE,
  }: { page?: number; perPage?: number } = {},
): Promise<CollectionDetail | null> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: {
      id: true,
      name: true,
      description: true,
      isFavorite: true,
      _count: { select: { items: true } },
      items: {
        orderBy: [
          { item: { isPinned: "desc" } },
          { item: { updatedAt: "desc" } },
        ],
        skip: pageOffset(page, perPage),
        take: perPage,
        select: { item: { select: itemSelect } },
      },
    },
  });
  if (!collection) return null;

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isFavorite: collection.isFavorite,
    items: collection.items.map((ic) => toDashboardItem(ic.item)),
    total: collection._count.items,
  };
}

// A collection as shown in the sidebar's Collections group.
export interface SidebarCollection {
  id: string;
  name: string;
  isFavorite: boolean;
  accentColor: string; // most-used type's color; drives the recent dot
}

// Collections for the sidebar's Collections group: all favorites, plus the
// four most recently updated. Each carries the accent color derived from its
// most-used item type (falling back to the default type for empty collections).
export async function getSidebarCollections(userId: string): Promise<{
  favorites: SidebarCollection[];
  recent: SidebarCollection[];
}> {
  // Only fetch what the sidebar renders: every favorite, plus the 4 most
  // recently updated collections — instead of loading every collection and
  // discarding all but these.
  const [favoriteRows, recentRows] = await Promise.all([
    prisma.collection.findMany({
      where: { userId, isFavorite: true },
      orderBy: { updatedAt: "desc" },
      include: {
        defaultType: { select: { color: true } },
        items: {
          select: {
            item: { select: { itemType: { select: { id: true, color: true } } } },
          },
        },
      },
    }),
    prisma.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        defaultType: { select: { color: true } },
        items: {
          select: {
            item: { select: { itemType: { select: { id: true, color: true } } } },
          },
        },
      },
    }),
  ]);

  const toSidebar = (
    collection: (typeof recentRows)[number],
  ): SidebarCollection => {
    // Most-used type's color drives the recent dot; fall back to the default type.
    const ranked = rankItemTypesByUsage(collection.items);
    return {
      id: collection.id,
      name: collection.name,
      isFavorite: collection.isFavorite,
      accentColor:
        ranked[0]?.color ?? collection.defaultType?.color ?? "currentColor",
    };
  };

  return {
    favorites: favoriteRows.map(toSidebar),
    recent: recentRows.map(toSidebar),
  };
}
