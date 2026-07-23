import { createElement } from "react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  getItemsByType,
  getSystemItemType,
  resolveSystemTypeName,
} from "@/lib/db/items";
import { getTypeIcon } from "@/lib/icons";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { ImageCard } from "@/components/dashboard/ImageCard";

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in");

  const { type } = await params;
  const typeName = resolveSystemTypeName(type);
  if (!typeName) notFound();

  const [itemType, items] = await Promise.all([
    getSystemItemType(typeName),
    getItemsByType(userId, typeName),
  ]);
  if (!itemType) notFound();

  const Icon = getTypeIcon(itemType.icon);
  const isImageType = itemType.name === "image";

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
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Items grid — responsive: 1 col mobile, 2 at sm, 3 at lg. Image types
          render as a thumbnail gallery instead of the generic item card. */}
      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) =>
            isImageType ? (
              <ImageCard key={item.id} item={item} />
            ) : (
              <ItemCard key={item.id} item={item} />
            ),
          )}
        </div>
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
