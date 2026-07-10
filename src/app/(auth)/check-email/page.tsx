import Link from "next/link";
import { MailCheck } from "lucide-react";

import { ResendVerification } from "@/components/auth/ResendVerification";

export const metadata = {
  title: "Check your email · DevStash",
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <MailCheck className="size-12 text-primary" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link
          {email ? (
            <>
              {" "}
              to <span className="font-medium text-foreground">{email}</span>
            </>
          ) : null}
          . Click it to activate your account, then sign in.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <ResendVerification email={email} />
        <p className="text-sm text-muted-foreground">
          Already verified?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
