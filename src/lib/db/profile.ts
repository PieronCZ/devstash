// Data fetching for the profile page: totals and a per-item-type breakdown for
// the authenticated user. Reads directly from the database via Prisma.

import { prisma } from "@/lib/prisma";
import { SYSTEM_TYPE_ORDER } from "@/lib/item-types";

// One row of the item-type breakdown shown on the profile page.
export interface ProfileTypeStat {
  id: string;
  name: string; // lowercase system type name
  icon: string; // lucide icon name
  color: string; // hex
  count: number; // items of this type owned by the user
}

export interface ProfileStats {
  totalItems: number;
  totalCollections: number;
  byType: ProfileTypeStat[];
}

// Totals + per-type item breakdown for a given user, ordered to match the
// product's canonical type listing.
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [totalItems, totalCollections, types] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
    prisma.itemType.findMany({
      where: { isSystem: true },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        _count: { select: { items: { where: { userId } } } },
      },
    }),
  ]);

  const byType = types
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

  return { totalItems, totalCollections, byType };
}
