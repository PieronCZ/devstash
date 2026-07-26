"use client";

import { Search } from "lucide-react";

import { CreateCollectionDialog } from "@/components/dashboard/CreateCollectionDialog";
import { CreateItemDialog } from "@/components/dashboard/CreateItemDialog";
import { useCommandPalette } from "@/components/dashboard/CommandPaletteProvider";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Top bar for the dashboard. The centered search button opens the command
// palette (Cmd+K); "New collection" and "New item" open their create dialogs.
export function TopBar() {
  const { openPalette, isMac } = useCommandPalette();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <SidebarTrigger className="cursor-pointer" />

      {/* Centered search trigger — fills the space between the trigger and the
          action buttons and centers itself within it. */}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search"
          className="flex h-9 w-full max-w-xl cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent/40"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search items and collections…</span>
          <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <CreateCollectionDialog />
        <CreateItemDialog />
      </div>
    </header>
  );
}
