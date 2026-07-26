import { LayoutGrid } from "lucide-react";

import { requireUserId } from "@/lib/session";
import { getRecentCollections } from "@/lib/db/collections";
import { CollectionCard } from "@/components/dashboard/CollectionCard";

export default async function CollectionsPage() {
  const userId = await requireUserId();

  // getRecentCollections returns all of the user's collections, newest first —
  // exactly what this page lists (its name reflects the dashboard's usage).
  const collections = await getRecentCollections(userId);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LayoutGrid className="size-6 text-muted-foreground" />
          Collections
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {collections.length}{" "}
          {collections.length === 1 ? "collection" : "collections"}
        </p>
      </div>

      {/* Collections grid — mirrors the dashboard's responsive stepping. */}
      {collections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No collections yet.</p>
        </div>
      )}
    </div>
  );
}
