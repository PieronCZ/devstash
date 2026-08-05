import { createElement } from "react";
import { notFound } from "next/navigation";

import { requireUserId } from "@/lib/session";
import {
  getItemsByType,
  getSystemItemType,
  resolveSystemTypeName,
} from "@/lib/db/items";
import { getTypeIcon } from "@/lib/icons";
import { ITEMS_PER_PAGE, parsePageParam, totalPages } from "@/lib/pagination";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { ImageCard } from "@/components/dashboard/ImageCard";
import { FileRow } from "@/components/dashboard/FileRow";
import { Pagination } from "@/components/dashboard/Pagination";

export default async function ItemsByTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const userId = await requireUserId();

  const { type } = await params;
  const typeName = resolveSystemTypeName(type);
  if (!typeName) notFound();

  const page = parsePageParam((await searchParams).page);

  const [itemType, { items, total }] = await Promise.all([
    getSystemItemType(typeName),
    getItemsByType(userId, typeName, { page }),
  ]);
  if (!itemType) notFound();

  const pageCount = totalPages(total, ITEMS_PER_PAGE);
  const Icon = getTypeIcon(itemType.icon);
  const isImageType = itemType.name === "image";
  const isFileType = itemType.name === "file";

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight capitalize">
          {createElement(Icon, {
            className: "size-6",
            style: { color: itemType.color },
          })}
          {itemType.name}s
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Items grid — responsive: 1 col mobile, 2 at sm, 3 at lg. Image types
          render as a thumbnail gallery, file types as a single-column list
          (Drive/Dropbox style); everything else as the generic item card. */}
      {items.length > 0 ? (
        <>
          {isFileType ? (
            <div className="divide-y rounded-xl border">
              {items.map((item) => (
                <FileRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) =>
                isImageType ? (
                  <ImageCard key={item.id} item={item} />
                ) : (
                  <ItemCard key={item.id} item={item} />
                ),
              )}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={pageCount}
            basePath={`/items/${type}`}
          />
        </>
      ) : (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No {itemType.name} items yet.
          </p>
        </div>
      )}
    </div>
  );
}
