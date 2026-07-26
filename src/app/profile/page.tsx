import { createElement } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FolderOpen, Layers } from "lucide-react";

import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getProfileStats } from "@/lib/db/profile";
import { getTypeIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ChangePasswordCard } from "@/components/profile/ChangePasswordCard";
import { DeleteAccountCard } from "@/components/profile/DeleteAccountCard";

export const metadata = {
  title: "Profile · DevStash",
};

const joinDateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function ProfilePage() {
  const userId = await requireUserId("/profile");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      isPro: true,
      passwordHash: true,
      createdAt: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) redirect("/sign-in");

  const stats = await getProfileStats(userId);

  const hasPassword = !!user.passwordHash;
  const oauthProviders = user.accounts.map((a) => a.provider);
  const signInMethod = oauthProviders.includes("github")
    ? "GitHub"
    : hasPassword
      ? "Email & password"
      : "—";

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        <ArrowLeft />
        Back to dashboard
      </Button>

      {/* Identity */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={user.name}
            image={user.image}
            className="size-16 rounded-full text-lg"
          />
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-xl font-semibold">
              {user.name ?? "Your account"}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="mt-0.5 font-medium">{user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-0.5 truncate font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="mt-0.5 font-medium">{user.isPro ? "Pro" : "Free"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sign-in method</dt>
            <dd className="mt-0.5 font-medium">{signInMethod}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="mt-0.5 font-medium">
              {joinDateFormat.format(user.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Usage */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Usage</h2>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <Layers className="size-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold">{stats.totalItems}</span>
              <span className="text-xs text-muted-foreground">Items</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <FolderOpen className="size-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-2xl font-semibold">
                {stats.totalCollections}
              </span>
              <span className="text-xs text-muted-foreground">Collections</span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            By type
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {stats.byType.map((type) => (
              <li
                key={type.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  {createElement(getTypeIcon(type.icon), {
                    className: "size-4",
                    style: { color: type.color },
                  })}
                  <span className="text-sm capitalize">{type.name}</span>
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {type.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Account actions */}
      {hasPassword ? <ChangePasswordCard /> : null}
      <DeleteAccountCard />
    </div>
  );
}
