"use client";

import { createElement } from "react";
import { Pin, Star } from "lucide-react";

import type { DashboardItem } from "@/lib/db/items";
import { getTypeIcon } from "@/lib/icons";
import { useItemDrawer } from "@/components/dashboard/ItemDrawerProvider";

export function ItemCard({ item }: { item: DashboardItem }) {
  const { color, icon: iconName, name } = item.type;
  const icon = getTypeIcon(iconName);
  const { openItem } = useItemDrawer();

  // The card is intentionally light — no content preview (that can be long and
  // is fetched on click). Clicking opens the drawer with the full detail.
  return (
    <button
      type="button"
      onClick={() => openItem(item.id)}
      style={{ borderLeftColor: color }}
      className="flex cursor-pointer flex-col rounded-xl border border-l-2 bg-card p-4 text-left transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span
          className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase"
          style={{ color }}
        >
          {createElement(icon, { className: "size-3.5" })}
          {name}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {item.isPinned ? <Pin className="size-3.5" /> : null}
          {item.isFavorite ? (
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
      </div>

      <h3 className="mt-2 font-medium leading-tight">{item.title}</h3>

      {item.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {item.description}
        </p>
      ) : null}

      {item.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
