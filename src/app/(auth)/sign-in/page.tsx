import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = {
  title: "Sign in · DevStash",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    registered?: string;
    reset?: string;
  }>;
}) {
  // Already authenticated — skip the form.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl, registered, reset } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your DevStash account
        </p>
      </div>
      {registered ? (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-center text-sm text-muted-foreground">
          Account created — sign in to continue.
        </p>
      ) : null}
      {reset ? (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-center text-sm text-muted-foreground">
          Password updated — sign in with your new password.
        </p>
      ) : null}
      <SignInForm callbackUrl={callbackUrl ?? "/dashboard"} />
    </div>
  );
}
