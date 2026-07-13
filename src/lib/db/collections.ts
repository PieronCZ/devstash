// Data fetching for the dashboard's collections section.
// Reads directly from the database via Prisma. Scoped to the authenticated
// user, whose id each function receives from the caller.

import { prisma } from "@/lib/prisma";

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
    // Tally usage per item type across the collection's items.
    const counts = new Map<string, { type: CollectionType; count: number }>();
    for (const { item } of collection.items) {
      const t = item.itemType;
      const entry = counts.get(t.id);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(t.id, {
          type: { id: t.id, icon: t.icon, color: t.color },
          count: 1,
        });
      }
    }

    // Most-used first. Fall back to the default type for empty collections.
    const ranked = [...counts.values()].sort((a, b) => b.count - a.count);
    const types: CollectionType[] =
      ranked.length > 0
        ? ranked.map((r) => r.type)
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
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      defaultType: { select: { color: true } },
      items: {
        select: {
          item: { select: { itemType: { select: { id: true, color: true } } } },
        },
      },
    },
  });

  const mapped: SidebarCollection[] = collections.map((collection) => {
    // Tally usage per item type to find the most-used one's color.
    const counts = new Map<string, { color: string; count: number }>();
    for (const { item } of collection.items) {
      const t = item.itemType;
      const entry = counts.get(t.id);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(t.id, { color: t.color, count: 1 });
      }
    }
    const ranked = [...counts.values()].sort((a, b) => b.count - a.count);

    return {
      id: collection.id,
      name: collection.name,
      isFavorite: collection.isFavorite,
      accentColor:
        ranked[0]?.color ?? collection.defaultType?.color ?? "currentColor",
    };
  });

  return {
    favorites: mapped.filter((c) => c.isFavorite),
    recent: mapped.slice(0, 4), // already sorted newest-first
  };
}
