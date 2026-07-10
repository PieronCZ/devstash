"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ResendVerificationProps {
  email?: string;
}

export function ResendVerification({ email }: ResendVerificationProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      setMessage(
        res.ok
          ? (data?.message ?? "Verification email sent.")
          : (data?.error ?? "Couldn't resend. Please try again."),
      );
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleResend}
        disabled={pending || !email}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Resend verification email
      </Button>
      {message ? (
        <p className="text-center text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
