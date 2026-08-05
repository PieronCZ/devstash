import { Image as ImageIcon, Star } from "lucide-react";
import { notFound } from "next/navigation";

import { requireUserId } from "@/lib/session";
import { getCollectionDetail } from "@/lib/db/collections";
import { ITEMS_PER_PAGE, parsePageParam, totalPages } from "@/lib/pagination";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { ImageCard } from "@/components/dashboard/ImageCard";
import { Pagination } from "@/components/dashboard/Pagination";
import { CollectionDetailActions } from "@/components/dashboard/CollectionDetailActions";

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const userId = await requireUserId();

  const { id } = await params;
  const page = parsePageParam((await searchParams).page);
  const collection = await getCollectionDetail(userId, id, { page });
  if (!collection) notFound();

  const pageCount = totalPages(collection.total, ITEMS_PER_PAGE);

  // Images render as a thumbnail gallery below the rest (like the images list);
  // everything else renders as generic cards above. Both are drawn from this
  // page's items only.
  const imageItems = collection.items.filter(
    (item) => item.type.name === "image",
  );
  const otherItems = collection.items.filter(
    (item) => item.type.name !== "image",
  );
  const { items, total } = collection;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {collection.name}
            {collection.isFavorite ? (
              <Star className="size-5 shrink-0 fill-amber-400 text-amber-400" />
            ) : null}
          </h1>
          {collection.description ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {collection.description}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? "item" : "items"}
          </p>
        </div>

        <CollectionDetailActions
          collection={{
            id: collection.id,
            name: collection.name,
            description: collection.description,
            isFavorite: collection.isFavorite,
          }}
        />
      </div>

      {/* Collections hold mixed types: non-image items render as generic cards,
          then images follow as a thumbnail gallery (like the images list). */}
      {items.length > 0 ? (
        <div className="space-y-6">
          {otherItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {otherItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}

          {imageItems.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <ImageIcon className="size-4" />
                Images
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {imageItems.map((item) => (
                  <ImageCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          <Pagination
            currentPage={page}
            totalPages={pageCount}
            basePath={`/collections/${id}`}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            This collection is empty.
          </p>
        </div>
      )}
    </div>
  );
}
