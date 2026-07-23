"use client";

import { ImageIcon, Pin, Star } from "lucide-react";

import type { DashboardItem } from "@/lib/db/items";
import { useItemDrawer } from "@/components/dashboard/ItemDrawerProvider";

// Gallery thumbnail card for image-type items — replaces the generic ItemCard in
// the `/items/images` grid. Shows the image at a 16:9 crop with a subtle hover
// zoom; clicking opens the drawer with the full detail (same as ItemCard).
export function ImageCard({ item }: { item: DashboardItem }) {
  const { openItem } = useItemDrawer();

  return (
    <button
      type="button"
      onClick={() => openItem(item.id)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {/* Thumbnail — 16:9, cropped to fill, zooms 5% on hover. */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {item.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 public URL, not a static asset
          <img
            src={item.fileUrl}
            alt={item.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}

        {/* Pin / favorite indicators, floated over the top-right corner. */}
        {item.isPinned || item.isFavorite ? (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-1 backdrop-blur-sm">
            {item.isPinned ? (
              <Pin className="size-3.5 text-muted-foreground" />
            ) : null}
            {item.isFavorite ? (
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Title */}
      <div className="p-3">
        <h3 className="truncate text-sm font-medium leading-tight">
          {item.title}
        </h3>
      </div>
    </button>
  );
}
