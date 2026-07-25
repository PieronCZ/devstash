"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import type { CollectionOption } from "@/lib/db/collections";
import { cn } from "@/lib/utils";

interface CollectionSelectProps {
  value: string[]; // selected collection ids
  onChange: (ids: string[]) => void;
  id?: string;
  placeholder?: string;
}

// A chip-style multi-select for adding an item to the user's collections. Fetches
// the user's collections from `/api/collections` on mount; selected ones render as
// removable chips, and a dropdown lists every collection with a checkmark to
// toggle membership. Unlike TagInput, the list is fixed — you pick from existing
// collections, you don't create new ones here.
export function CollectionSelect({
  value,
  onChange,
  id,
  placeholder = "Add to collections…",
}: CollectionSelectProps) {
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch the user's collections once.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/collections", {
          signal: controller.signal,
        });
        if (!res.ok) return;
        setCollections((await res.json()) as CollectionOption[]);
      } catch {
        // Ignore aborts / network errors — the picker is non-critical.
      } finally {
        setLoaded(true);
      }
    })();
    return () => controller.abort();
  }, []);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const selected = new Set(value);
  const selectedCollections = collections.filter((c) => selected.has(c.id));

  function toggle(collectionId: string) {
    if (selected.has(collectionId)) {
      onChange(value.filter((v) => v !== collectionId));
    } else {
      onChange([...value, collectionId]);
    }
  }

  function remove(collectionId: string) {
    onChange(value.filter((v) => v !== collectionId));
  }

  const hasCollections = collections.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
        onClick={() => hasCollections && setOpen(true)}
      >
        {selectedCollections.map((collection) => (
          <span
            key={collection.id}
            className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground"
          >
            {collection.name}
            <button
              type="button"
              aria-label={`Remove from ${collection.name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(collection.id);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <span
          className={cn(
            "flex-1 truncate py-0.5 text-muted-foreground",
            selectedCollections.length > 0 && "sr-only",
          )}
        >
          {loaded && !hasCollections ? "No collections yet" : placeholder}
        </span>
        <button
          type="button"
          id={id}
          aria-label="Choose collections"
          disabled={!hasCollections}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {open && hasCollections ? (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
          {collections.map((collection) => {
            const isSelected = selected.has(collection.id);
            return (
              <li key={collection.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggle(collection.id);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground",
                    isSelected && "text-foreground",
                  )}
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{collection.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
