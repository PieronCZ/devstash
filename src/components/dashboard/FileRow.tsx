"use client";

import { createElement } from "react";
import { Download, Pin, Star } from "lucide-react";

import type { DashboardItem } from "@/lib/db/items";
import { getFileIcon } from "@/lib/file-icons";
import { formatFileSize, relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useItemDrawer } from "@/components/dashboard/ItemDrawerProvider";

// A single list row for a file-type item — Google Drive / Dropbox style, used
// in place of the grid card on `/items/files`. Clicking the row opens the
// drawer; the Download button downloads directly (stops propagation so it
// doesn't also open the drawer). Info stacks vertically on mobile.
export function FileRow({ item }: { item: DashboardItem }) {
  const { openItem } = useItemDrawer();
  const icon = getFileIcon(item.fileName);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openItem(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openItem(item.id);
        }
      }}
      className="group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {createElement(icon, {
        className: "size-8 shrink-0 text-muted-foreground",
      })}

      {/* Name + meta — side by side on desktop, stacked on mobile. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {item.fileName && item.fileName !== item.title ? (
            <p className="truncate text-xs text-muted-foreground">
              {item.fileName}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground sm:shrink-0">
          {item.fileSize != null ? (
            <span className="shrink-0">{formatFileSize(item.fileSize)}</span>
          ) : null}
          <span className="shrink-0">{relativeTime(item.createdAt)}</span>
        </div>
      </div>

      {/* Pin / favorite indicators. */}
      {item.isPinned || item.isFavorite ? (
        <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          {item.isPinned ? <Pin className="size-3.5" /> : null}
          {item.isFavorite ? (
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
      ) : null}

      {/* Download — direct, doesn't open the drawer. */}
      <Button
        variant="ghost"
        size="icon"
        nativeButton={false}
        onClick={(e) => e.stopPropagation()}
        render={
          <a
            href={`/api/items/${item.id}/download`}
            download={item.fileName ?? true}
            aria-label={`Download ${item.title}`}
          />
        }
      >
        <Download />
      </Button>
    </div>
  );
}
