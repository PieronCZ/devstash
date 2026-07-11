import Link from "next/link";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";

import { auth } from "@/auth";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset password · DevStash",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // Already authenticated — no need to reset from here.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <XCircle className="size-12 text-destructive" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This link is missing its token. Request a new one to continue.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
