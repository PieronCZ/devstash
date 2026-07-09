import Link from "next/link";
import { Star } from "lucide-react";

import { items, itemTypes, type Collection } from "@/lib/mock-data";
import { getTypeIcon } from "@/lib/icons";
import { relativeTime } from "@/lib/format";

function typeColor(typeId: string): string {
  return itemTypes.find((type) => type.id === typeId)?.color ?? "currentColor";
}

// Distinct item types held by a collection, for the little icon chips.
// Falls back to the collection's default type when it has no items yet.
function collectionTypeIds(collection: Collection): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.collectionIds.includes(collection.id)) ids.add(item.typeId);
  }
  if (ids.size === 0) ids.add(collection.defaultTypeId);
  return [...ids].slice(0, 3);
}

export function CollectionCard({ collection }: { collection: Collection }) {
  const accent = typeColor(collection.defaultTypeId);
  const typeIds = collectionTypeIds(collection);

  return (
    <Link
      href={`/collections/${collection.id}`}
      style={{ borderTopColor: accent }}
      className="flex flex-col rounded-xl border border-t-2 bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{collection.name}</h3>
        {collection.isFavorite ? (
          <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
        ) : null}
      </div>

      {collection.description ? (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {collection.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {typeIds.map((typeId) => {
            const type = itemTypes.find((t) => t.id === typeId);
            const Icon = getTypeIcon(type?.icon ?? "File");
            const color = type?.color ?? "currentColor";
            return (
              <span
                key={typeId}
                className="flex size-6 items-center justify-center rounded-md"
                style={{ backgroundColor: `${color}1a` }}
              >
                <Icon className="size-3.5" style={{ color }} />
              </span>
            );
          })}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{collection.itemCount} items</div>
          <div>{relativeTime(collection.updatedAt)}</div>
        </div>
      </div>
    </Link>
  );
}
