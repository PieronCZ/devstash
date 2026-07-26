"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateCollection } from "@/actions/collections";
import { Field } from "@/components/dashboard/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface EditableCollection {
  id: string;
  name: string;
  description: string | null;
}

// Edit a collection's metadata. Controlled by the parent (the card menu or the
// detail-page actions own the open state) so a single dialog can be opened from
// several triggers. Fields are (re)seeded from the collection each time the
// dialog opens. Mirrors CreateCollectionDialog: no form library, inline
// `role="alert"` errors, success closes + router.refresh() so every surface
// picks up the new name/description.
export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
}: {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");

  // Re-seed the fields from the collection each time the dialog transitions to
  // open, so reopening (or opening a different card's menu) starts from the
  // current values. Adjusting state during render (React's recommended pattern
  // over an effect) — no DOM is committed for the discarded render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(collection.name);
      setDescription(collection.description ?? "");
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await updateCollection(collection.id, { name, description });
      if (res.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>
            Update this collection&apos;s name and description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="flex flex-col gap-5">
            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            {/* Name */}
            <Field label="Name" htmlFor="edit-collection-name" required>
              <Input
                id="edit-collection-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. React Patterns"
              />
            </Field>

            {/* Description */}
            <Field label="Description" htmlFor="edit-collection-description">
              <Textarea
                id="edit-collection-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending} />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
