import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSidebarCollections } from "@/lib/db/collections";
import { getSidebarItemTypes } from "@/lib/db/items";
import { getSearchData } from "@/lib/db/search";
import { AppSidebar, type SidebarUser } from "@/components/dashboard/AppSidebar";
import { CommandPaletteProvider } from "@/components/dashboard/CommandPaletteProvider";
import { ItemDrawerProvider } from "@/components/dashboard/ItemDrawerProvider";
import { TopBar } from "@/components/dashboard/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

// The authenticated app shell (sidebar + top bar + main content), shared by
// every route that lives inside the dashboard experience (/dashboard, /items).
// Resolves the session, scopes the sidebar reads to that user, and renders the
// chrome around `children`.
export async function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Persist the collapsed/expanded state across navigations and reloads.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // The proxy guarantees a session on these routes, but resolve it first so the
  // sidebar reads are scoped to this user.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in");

  const [itemTypes, collections, searchData, dbUser] = await Promise.all([
    getSidebarItemTypes(userId),
    getSidebarCollections(userId),
    getSearchData(userId),
    // `isPro` isn't on the token — fetch it (and the freshest name/image) for
    // the footer user card.
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true, isPro: true },
    }),
  ]);

  const user: SidebarUser = {
    name: dbUser?.name ?? session?.user?.name ?? null,
    email: dbUser?.email ?? session?.user?.email ?? null,
    image: dbUser?.image ?? session?.user?.image ?? null,
    isPro: dbUser?.isPro ?? false,
  };

  return (
    <TooltipProvider>
      {/* Cap the shell at the viewport height so the top bar stays fixed and only
          the content area scrolls (see the scrollable <main> below). */}
      <SidebarProvider defaultOpen={defaultOpen} className="h-svh">
        <AppSidebar itemTypes={itemTypes} collections={collections} user={user} />
        <SidebarInset className="min-h-0 overflow-hidden">
          {/* Both providers wrap the top bar + content so the palette (and the
              search button in the top bar) can open the item drawer. */}
          <ItemDrawerProvider>
            <CommandPaletteProvider data={searchData}>
              <TopBar />
              <main className="min-h-0 flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </CommandPaletteProvider>
          </ItemDrawerProvider>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
