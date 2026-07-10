import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

export const metadata = {
  title: "Profile · DevStash",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, isPro: true },
  });

  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 p-6">
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
            <dd className="mt-0.5 font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="mt-0.5 font-medium">{user.isPro ? "Pro" : "Free"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
