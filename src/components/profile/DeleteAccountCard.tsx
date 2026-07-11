"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// The user must type this exactly to confirm deletion.
const CONFIRM_WORD = "DELETE";

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = confirmText === CONFIRM_WORD;

  // Reset the confirmation input whenever the dialog opens or closes.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    setConfirmText("");
    setError(null);
  }

  async function handleDelete(event: React.MouseEvent) {
    // Keep the dialog open (with a spinner) through the request + redirect.
    event.preventDefault();
    if (!confirmed) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't delete your account. Please try again.");
        setDeleting(false);
        return;
      }
      // Account gone — clear the session and land on sign-in.
      await signOut({ callbackUrl: "/sign-in" });
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-sm font-semibold">Delete account</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Permanently delete your account and all of your items, collections,
            and tags. This can&apos;t be undone.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and everything in it — items,
              collections, and tags. This action can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmDelete" className="text-sm">
              Type <span className="font-semibold">{CONFIRM_WORD}</span> to confirm
            </label>
            <Input
              id="confirmDelete"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={CONFIRM_WORD}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="cursor-pointer"
              disabled={deleting || !confirmed}
              onClick={handleDelete}
            >
              {deleting ? <LoaderCircle className="animate-spin" /> : null}
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
