"use client";

import { createElement, useState } from "react";
import { Check, Copy, Pin, Star } from "lucide-react";

import type { DashboardItem, ItemDetail } from "@/lib/db/items";
import { getTypeIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useItemDrawer } from "@/components/dashboard/ItemDrawerProvider";

// The payload a user copies from a card, by content kind — mirrors the drawer's
// copy action (URL → url, FILE → filename, TEXT → content).
function copyText(item: ItemDetail): string {
  if (item.contentType === "URL") return item.url ?? "";
  if (item.contentType === "FILE") return item.fileName ?? "";
  return item.content ?? "";
}

export function ItemCard({ item }: { item: DashboardItem }) {
  const { color, icon: iconName, name } = item.type;
  const icon = getTypeIcon(iconName);
  const { openItem } = useItemDrawer();
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  // Cards are intentionally light and carry no `content`/`url`, so the quick copy
  // fetches the full detail on demand (same endpoint the drawer uses) and copies
  // the right payload for the item's kind.
  async function handleCopy() {
    if (copying) return;
    setCopying(true);
    try {
      const res = await fetch(`/api/items/${item.id}`);
      if (!res.ok) throw new Error(`Failed to load item (${res.status})`);
      const detail = (await res.json()) as ItemDetail;
      await navigator.clipboard.writeText(copyText(detail));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent — nothing to copy or the fetch failed; the drawer remains the
      // full-fidelity path.
    } finally {
      setCopying(false);
    }
  }

  // The card is intentionally light — no content preview (that can be long and
  // is fetched on click). Clicking opens the drawer with the full detail.
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
      style={{ borderLeftColor: color }}
      className="group flex cursor-pointer flex-col rounded-xl border border-l-2 bg-card p-4 text-left transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
          {/* Quick copy — visible on hover/focus, doesn't open the drawer. */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Copy ${item.title}`}
            disabled={copying}
            onClick={(e) => {
              e.stopPropagation();
              void handleCopy();
            }}
          >
            {copied ? <Check className="text-emerald-500" /> : <Copy />}
          </Button>
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
    </div>
  );
}
