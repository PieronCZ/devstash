// Data fetching for the dashboard's collections section.
// Reads directly from the database via Prisma. Scoped to the authenticated
// user, whose id each function receives from the caller.

import { prisma } from "@/lib/prisma";
import type { CreateCollectionInput } from "@/lib/validations/collections";

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

// Recent collections for the given user, newest first, with the data the
// card needs: item count, distinct types, and the accent color derived from
// the most-used item type in each collection.
export async function getRecentCollections(
  userId: string,
): Promise<DashboardCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
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
    },
  });

  return collections.map((collection) => {
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
  });
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
