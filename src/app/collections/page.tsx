import { LayoutGrid } from "lucide-react";

import { requireUserId } from "@/lib/session";
import { getCollectionsPage } from "@/lib/db/collections";
import {
  COLLECTIONS_PER_PAGE,
  parsePageParam,
  totalPages,
} from "@/lib/pagination";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { Pagination } from "@/components/dashboard/Pagination";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const userId = await requireUserId();

  const page = parsePageParam((await searchParams).page);
  const { collections, total } = await getCollectionsPage(userId, { page });
  const pageCount = totalPages(total, COLLECTIONS_PER_PAGE);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LayoutGrid className="size-6 text-muted-foreground" />
          Collections
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? "collection" : "collections"}
        </p>
      </div>

      {/* Collections grid — mirrors the dashboard's responsive stepping. */}
      {collections.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={pageCount}
            basePath="/collections"
          />
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No collections yet.</p>
        </div>
      )}
    </div>
  );
}
