"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EditCollectionDialog,
  type EditableCollection,
} from "@/components/dashboard/EditCollectionDialog";
import { DeleteCollectionDialog } from "@/components/dashboard/DeleteCollectionDialog";

// Edit / Favorite / Delete actions in the collection detail page header. Owns
// the edit + delete dialog state; deleting redirects back to the collections
// list (the collection no longer exists). Favorite is UI-only for now.
export function CollectionDetailActions({
  collection,
}: {
  collection: EditableCollection & { isFavorite: boolean };
}) {
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-label="Favorite collection"
      >
        <Star
          className={
            collection.isFavorite ? "fill-amber-400 text-amber-400" : ""
          }
        />
        Favorite
      </Button>

      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil />
        Edit
      </Button>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 />
        Delete
      </Button>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteCollectionDialog
        collectionId={collection.id}
        collectionName={collection.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          // The collection is gone — leave the detail page.
          router.push("/collections");
          router.refresh();
        }}
      />
    </div>
  );
}
