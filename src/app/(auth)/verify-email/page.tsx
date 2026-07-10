import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VerifyTokenResult } from "@/lib/tokens";

export const metadata = {
  title: "Verify email · DevStash",
};

const CONTENT: Record<
  VerifyTokenResult,
  { icon: "success" | "error"; title: string; body: string }
> = {
  success: {
    icon: "success",
    title: "Email verified",
    body: "Your email address is confirmed. You can now sign in to your account.",
  },
  expired: {
    icon: "error",
    title: "Link expired",
    body: "This verification link has expired. Sign in to request a fresh one.",
  },
  invalid: {
    icon: "error",
    title: "Invalid link",
    body: "This verification link is invalid or has already been used. Sign in to request a new one.",
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const key: VerifyTokenResult =
    status === "success" || status === "expired" ? status : "invalid";
  const { icon, title, body } = CONTENT[key];

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {icon === "success" ? (
        <CheckCircle2 className="size-12 text-emerald-500" />
      ) : (
        <XCircle className="size-12 text-destructive" />
      )}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <Link href="/sign-in" className={cn(buttonVariants(), "w-full")}>
        Go to sign in
      </Link>
    </div>
  );
}
