import type { LucideIcon } from "lucide-react";
import { Boxes, Clock, FolderHeart, FolderOpen, LayoutGrid, Pin, Star } from "lucide-react";
import { requireUserId } from "@/lib/session";
import {
  getCollectionStats,
  getRecentCollections,
} from "@/lib/db/collections";
import { getItemStats, getPinnedItems, getRecentItems } from "@/lib/db/items";
import { DASHBOARD_RECENT_ITEMS_LIMIT } from "@/lib/pagination";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { StatCard } from "@/components/dashboard/StatCard";

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
  const userId = await requireUserId();

  const [recentCollections, collectionStats, itemStats, pinnedItems, recentItems] =
    await Promise.all([
      getRecentCollections(userId),
      getCollectionStats(userId),
      getItemStats(userId),
      getPinnedItems(userId),
      getRecentItems(userId, DASHBOARD_RECENT_ITEMS_LIMIT),
    ]);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {itemStats.total} items · {collectionStats.total} collections
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Items" value={itemStats.total} icon={Boxes} />
        <StatCard
          label="Collections"
          value={collectionStats.total}
          icon={FolderOpen}
        />
        <StatCard
          label="Favorite items"
          value={itemStats.favorites}
          icon={Star}
        />
        <StatCard
          label="Favorite collections"
          value={collectionStats.favorites}
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
