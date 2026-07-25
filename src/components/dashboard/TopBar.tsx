import { Search } from "lucide-react";

import { CreateCollectionDialog } from "@/components/dashboard/CreateCollectionDialog";
import { CreateItemDialog } from "@/components/dashboard/CreateItemDialog";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Top bar for the dashboard. Search is not wired up yet; "New collection" and
// "New item" open their respective create dialogs.
export function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <SidebarTrigger className="cursor-pointer" />

      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search snippets, prompts, tags…"
          className="pl-9"
          aria-label="Search"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CreateCollectionDialog />
        <CreateItemDialog />
      </div>
    </header>
  );
}
