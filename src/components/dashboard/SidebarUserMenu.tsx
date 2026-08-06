"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronsUpDown, LoaderCircle, LogOut, Settings, User } from "lucide-react";

import { UserAvatar } from "@/components/ui/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export interface SidebarUser {
  name: string | null;
  email: string | null;
  image: string | null;
  isPro: boolean;
}

// The sidebar footer's account card: a dropdown (Profile + Sign out) whose whole
// card is the trigger, plus the sign-out confirmation dialog. Owns its own
// open/pending state, which is why it lives apart from the AppSidebar shell.
export function SidebarUserMenu({ user }: { user: SidebarUser }) {
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* The whole user card is the account-menu trigger. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="cursor-pointer" />}
          >
            <UserAvatar
              name={user.name}
              image={user.image}
              className="size-7 text-[10px]"
            />
            <span className="flex min-w-0 flex-col text-left leading-tight">
              <span className="truncate text-sm font-medium text-sidebar-accent-foreground">
                {user.name ?? "Your account"}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56">
            <DropdownMenuItem
              className="cursor-pointer"
              render={<Link href="/profile" />}
            >
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              render={<Link href="/settings" />}
            >
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={() => setSignOutOpen(true)}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;ll need to sign in again to get back to your stash.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer" disabled={signingOut}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="cursor-pointer"
                disabled={signingOut}
                onClick={(e) => {
                  // Keep the dialog open (with a spinner) through the redirect.
                  e.preventDefault();
                  setSigningOut(true);
                  signOut({ callbackUrl: "/sign-in" });
                }}
              >
                {signingOut ? <LoaderCircle className="animate-spin" /> : null}
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
