"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  Clock,
  Folder,
  Plus,
  Settings,
  Sparkles,
  Star,
} from "lucide-react";

import {
  collections,
  currentUser,
  itemTypes,
  type Collection,
} from "@/lib/mock-data";
import { getTypeIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Primary navigation shown above the type list.
const mainNav = [
  { title: "All items", href: "/dashboard", icon: Boxes },
  { title: "Favorites", href: "/favorites", icon: Star },
  { title: "Recent", href: "/recent", icon: Clock },
];

// Accent color for a collection, taken from its default item type.
function collectionColor(collection: Collection): string {
  return (
    itemTypes.find((type) => type.id === collection.defaultTypeId)?.color ??
    "currentColor"
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  const favoriteCollections = collections.filter(
    (collection) => collection.isFavorite,
  );
  const recentCollections = [...collections]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const renderCollection = (collection: Collection) => (
    <SidebarMenuItem key={collection.id}>
      <SidebarMenuButton
        isActive={isActive(`/collections/${collection.id}`)}
        tooltip={collection.name}
        render={<Link href={`/collections/${collection.id}`} />}
      >
        <Folder style={{ color: collectionColor(collection) }} />
        <span>{collection.name}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      {/* Height matched to the TopBar so the logo lines up with the search bar. */}
      <SidebarHeader className="h-16 flex-row items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden rounded-md p-1 font-semibold text-sidebar-accent-foreground"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Boxes className="size-4" />
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">
            DevStash
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Item types */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider">
            Types
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itemTypes.map((type) => {
                const Icon = getTypeIcon(type.icon);
                return (
                  <SidebarMenuItem key={type.id}>
                    <SidebarMenuButton
                      isActive={isActive(type.route)}
                      tooltip={type.name}
                      render={<Link href={type.route} />}
                    >
                      <Icon style={{ color: type.color }} />
                      <span>{type.name}</span>
                    </SidebarMenuButton>
                    {type.isPro ? (
                      <SidebarMenuBadge className="right-9 rounded-sm bg-sidebar-accent px-1 text-[10px] tracking-wide text-sidebar-foreground/60">
                        PRO
                      </SidebarMenuBadge>
                    ) : null}
                    <SidebarMenuBadge className="text-sidebar-foreground/45">
                      {type.itemCount}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collections — expandable, with Favorites and Recent subsections */}
        <Collapsible
          open={collectionsOpen}
          onOpenChange={setCollectionsOpen}
          className="group/collections"
        >
          <SidebarGroup>
            <SidebarGroupLabel
              className="uppercase tracking-wider hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              render={<CollapsibleTrigger />}
            >
              <ChevronRight
                className={cn(
                  "mr-1 size-3.5 transition-transform duration-200",
                  collectionsOpen && "rotate-90",
                )}
              />
              Collections
            </SidebarGroupLabel>
            <SidebarGroupAction
              title="New collection"
              render={<Link href="/collections/new" />}
            >
              <Plus />
              <span className="sr-only">New collection</span>
            </SidebarGroupAction>

            <CollapsibleContent>
              <SidebarGroupContent>
                <p className="px-2 pt-2 pb-0.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
                  Favorites
                </p>
                <SidebarMenu>
                  {favoriteCollections.map(renderCollection)}
                </SidebarMenu>

                <p className="px-2 pt-3 pb-0.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
                  Recent
                </p>
                <SidebarMenu>
                  {recentCollections.map(renderCollection)}
                </SidebarMenu>

                <SidebarMenu className="mt-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="text-sidebar-foreground/60"
                      tooltip="View all collections"
                      render={<Link href="/collections" />}
                    >
                      <Boxes />
                      <span>View all collections</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter>
        {!currentUser.isPro ? (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 text-sm font-medium text-sidebar-accent-foreground">
              <Sparkles className="size-4 text-primary" />
              Upgrade to Pro
            </div>
            <p className="mt-1 text-xs text-sidebar-foreground/60">
              Unlock file uploads, AI tagging, and unlimited stashing.
            </p>
            <Button
              size="sm"
              nativeButton={false}
              className="mt-3 w-full"
              render={<Link href="/upgrade" />}
            >
              Go Pro
            </Button>
          </div>
        ) : null}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={currentUser.name}
              render={<Link href="/account" />}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                {initials(currentUser.name)}
              </span>
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate text-sm font-medium text-sidebar-accent-foreground">
                  {currentUser.name}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {currentUser.email}
                </span>
              </span>
            </SidebarMenuButton>
            <SidebarMenuAction
              title="Settings"
              render={<Link href="/settings" />}
            >
              <Settings />
              <span className="sr-only">Settings</span>
            </SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
