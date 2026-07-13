import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSidebarCollections } from "@/lib/db/collections";
import { getSidebarItemTypes } from "@/lib/db/items";
import { AppSidebar, type SidebarUser } from "@/components/dashboard/AppSidebar";
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

  const [itemTypes, collections, dbUser] = await Promise.all([
    getSidebarItemTypes(userId),
    getSidebarCollections(userId),
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
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar itemTypes={itemTypes} collections={collections} user={user} />
        <SidebarInset>
          <TopBar />
          <main className="flex-1 p-6">
            <ItemDrawerProvider>{children}</ItemDrawerProvider>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
