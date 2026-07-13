import Link from "next/link";
import { XCircle } from "lucide-react";

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata = {
  title: "Verify email · DevStash",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <XCircle className="size-12 text-destructive" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold">Invalid link</h1>
          <p className="text-sm text-muted-foreground">
            This verification link is missing its token. Sign in to request a new
            one.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return <VerifyEmailForm token={token} />;
}
