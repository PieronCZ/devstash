import { cookies } from "next/headers";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSidebarCollections } from "@/lib/db/collections";
import { getSidebarItemTypes } from "@/lib/db/items";
import { AppSidebar, type SidebarUser } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Persist the collapsed/expanded state across navigations and reloads.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const [session, itemTypes, collections] = await Promise.all([
    auth(),
    getSidebarItemTypes(),
    getSidebarCollections(),
  ]);

  // The proxy guarantees a session here, but `isPro` isn't on the token —
  // fetch it (and the freshest name/image) for the footer user card.
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, image: true, isPro: true },
      })
    : null;

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
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
