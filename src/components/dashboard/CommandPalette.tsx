"use client";

import { createElement } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";

import type { SearchData } from "@/lib/db/search";
import { commandFilter } from "@/lib/command-filter";
import { getTypeIcon } from "@/lib/icons";
import { useItemDrawer } from "@/components/dashboard/ItemDrawerProvider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// The command palette itself (Cmd+K). Controlled by CommandPaletteProvider,
// which owns the open state + keyboard shortcut and passes the searchable data.
// Filtering is entirely client-side (cmdk's built-in fuzzy scorer over each
// item's keywords); selecting a result opens the item drawer or navigates to the
// collection page.
export function CommandPalette({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SearchData;
}) {
  const router = useRouter();
  const { openItem } = useItemDrawer();

  const selectItem = (id: string) => {
    onOpenChange(false);
    openItem(id);
  };

  const selectCollection = (id: string) => {
    onOpenChange(false);
    router.push(`/collections/${id}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} filter={commandFilter}>
      <CommandInput placeholder="Search items and collections…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {data.items.length > 0 ? (
          <CommandGroup heading="Items">
            {data.items.map((item) => {
              const Icon = getTypeIcon(item.type.icon);
              return (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  keywords={[item.title, item.type.name, item.preview ?? ""]}
                  onSelect={() => selectItem(item.id)}
                >
                  {createElement(Icon, {
                    className: "size-4 shrink-0",
                    style: { color: item.type.color },
                  })}
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {item.preview ? (
                    <span className="max-w-[45%] shrink-0 truncate text-xs text-muted-foreground">
                      {item.preview}
                    </span>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        {data.collections.length > 0 ? (
          <CommandGroup heading="Collections">
            {data.collections.map((collection) => (
              <CommandItem
                key={collection.id}
                value={collection.id}
                keywords={[collection.name]}
                onSelect={() => selectCollection(collection.id)}
              >
                <Layers className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {collection.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {collection.itemCount}{" "}
                  {collection.itemCount === 1 ? "item" : "items"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
