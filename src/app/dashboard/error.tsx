"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

// Route-level error boundary for the dashboard. Catches errors thrown while
// rendering the page (e.g. a failed DB read) and offers a retry via reset().
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging; wire to a reporter later.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t load your dashboard. This is usually temporary — try
          again in a moment.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
