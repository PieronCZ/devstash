"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { deleteCollection } from "@/actions/collections";
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

// Confirm-and-delete a collection. Controlled by the parent (same pattern as the
// edit dialog). Deleting removes only the collection and its item↔collection
// links — the items themselves are kept, which the copy makes explicit. On
// success the parent decides what happens next via `onDeleted` (the card grid
// refreshes; the detail page redirects back to /collections).
export function DeleteCollectionDialog({
  collectionId,
  collectionName,
  open,
  onOpenChange,
  onDeleted,
}: {
  collectionId: string;
  collectionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(event: React.MouseEvent) {
    // Keep the dialog open (with a spinner) while the action runs.
    event.preventDefault();
    setError(null);
    setDeleting(true);

    void (async () => {
      const res = await deleteCollection(collectionId);
      if (res.success) {
        onDeleted();
      } else {
        setError(res.error);
        setDeleting(false);
      }
    })();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{collectionName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the collection only. The items in it are kept — they
            just won&apos;t belong to this collection anymore.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={handleConfirm}
          >
            {deleting ? <LoaderCircle className="animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
