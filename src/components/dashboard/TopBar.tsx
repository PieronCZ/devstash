import { FolderPlus, Search } from "lucide-react";

import { CreateItemDialog } from "@/components/dashboard/CreateItemDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Top bar for the dashboard. Search and "New collection" are not wired up yet;
// "New item" opens the create-item dialog.
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
        <Button variant="outline">
          <FolderPlus className="size-4" />
          New collection
        </Button>
        <CreateItemDialog />
      </div>
    </header>
  );
}
