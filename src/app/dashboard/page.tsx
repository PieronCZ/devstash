import type { LucideIcon } from "lucide-react";
import { Boxes, Clock, FolderHeart, FolderOpen, LayoutGrid, Pin, Star } from "lucide-react";

import { getRecentCollections } from "@/lib/db/collections";
import { getItemStats, getPinnedItems, getRecentItems } from "@/lib/db/items";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { StatCard } from "@/components/dashboard/StatCard";

// Collections are read live from the database on each request.
export const dynamic = "force-dynamic";

function SectionHeader({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      <Icon className="size-4" />
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const [recentCollections, itemStats, pinnedItems, recentItems] =
    await Promise.all([
      getRecentCollections(),
      getItemStats(),
      getPinnedItems(),
      getRecentItems(10),
    ]);

  const favoriteCollections = recentCollections.filter(
    (collection) => collection.isFavorite,
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {itemStats.total} items · {recentCollections.length} collections
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Items" value={itemStats.total} icon={Boxes} />
        <StatCard
          label="Collections"
          value={recentCollections.length}
          icon={FolderOpen}
        />
        <StatCard
          label="Favorite items"
          value={itemStats.favorites}
          icon={Star}
        />
        <StatCard
          label="Favorite collections"
          value={favoriteCollections.length}
          icon={FolderHeart}
        />
      </div>

      {/* Recent collections */}
      <section>
        <SectionHeader icon={LayoutGrid}>Collections</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recentCollections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </section>

      {/* Pinned items */}
      {pinnedItems.length > 0 ? (
        <section>
          <SectionHeader icon={Pin}>Pinned</SectionHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {pinnedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent items */}
      <section>
        <SectionHeader icon={Clock}>Recent items</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recentItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
