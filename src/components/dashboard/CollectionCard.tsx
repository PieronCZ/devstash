import Link from "next/link";
import { Star } from "lucide-react";

import type { DashboardCollection } from "@/lib/db/collections";
import { getTypeIcon } from "@/lib/icons";
import { relativeTime } from "@/lib/format";

export function CollectionCard({
  collection,
}: {
  collection: DashboardCollection;
}) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      style={{ borderTopColor: collection.accentColor }}
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
          {collection.types.map((type) => {
            const Icon = getTypeIcon(type.icon);
            return (
              <span
                key={type.id}
                className="flex size-6 items-center justify-center rounded-md"
                style={{ backgroundColor: `${type.color}1a` }}
              >
                <Icon className="size-3.5" style={{ color: type.color }} />
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
