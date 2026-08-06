import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireUserId } from "@/lib/session";
import { getUserHasPassword } from "@/lib/db/account";
import { Button } from "@/components/ui/button";
import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";

export const metadata = {
  title: "Settings · DevStash",
};

export default async function SettingsPage() {
  const userId = await requireUserId("/settings");

  // Password change is only available to credentials accounts (OAuth-only
  // accounts have no password to change).
  const hasPassword = await getUserHasPassword(userId);

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

      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your account.
        </p>
      </div>

      {/* Account actions */}
      {hasPassword ? <ChangePasswordCard /> : null}
      <DeleteAccountCard />
    </div>
  );
}
