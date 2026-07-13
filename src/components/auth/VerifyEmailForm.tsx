"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VerifyTokenResult } from "@/lib/tokens";

// Confirm screen for the emailed verification link. The link points here (a
// plain page render — safe for mail-scanner prefetch); clicking the button
// POSTs the token to actually consume it.
type State = "idle" | "pending" | VerifyTokenResult | "error";

const RESULT: Record<
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

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, setState] = useState<State>("idle");

  async function handleVerify() {
    setState("pending");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      const status = data?.status;
      if (status === "success" || status === "expired" || status === "invalid") {
        setState(status);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  // Prompt / in-flight: show the confirm button.
  if (state === "idle" || state === "pending") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold">Verify your email</h1>
          <p className="text-sm text-muted-foreground">
            Confirm your email address to activate your DevStash account.
          </p>
        </div>
        <Button
          onClick={handleVerify}
          className="w-full"
          disabled={state === "pending"}
        >
          {state === "pending" ? <LoaderCircle className="animate-spin" /> : null}
          Verify email
        </Button>
      </div>
    );
  }

  // Network/unexpected failure — let the user retry without a fresh link.
  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <XCircle className="size-12 text-destructive" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t verify your email just now. Please try again.
          </p>
        </div>
        <Button onClick={handleVerify} className="w-full">
          Try again
        </Button>
      </div>
    );
  }

  // Terminal result from the server (success / expired / invalid).
  const { icon, title, body } = RESULT[state];
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
