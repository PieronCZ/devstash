"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { ActionResult } from "@/actions/types";
import {
  createCollection as createCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  updateCollection as updateCollectionQuery,
  type CreatedCollection,
} from "@/lib/db/collections";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/lib/validations/collections";

// Re-render the surfaces that show collections after a mutation. Client callers
// also `router.refresh()` for the current route; this covers the sidebar
// (rendered in the shared layout), the dashboard/items grids, and the
// collections list + detail pages.
function revalidateCollectionViews() {
  revalidatePath("/dashboard");
  revalidatePath("/items/[type]", "page");
  revalidatePath("/collections");
  revalidatePath("/collections/[id]", "page");
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Create a new collection from the New Collection dialog. Validates the payload
// with Zod (source of truth for required fields), then delegates the write to the
// query layer. Returns the created collection; the first Zod issue is surfaced as
// `error` for inline display.
export async function createCollection(
  input: unknown,
): Promise<ActionResult<{ collection: CreatedCollection }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const collection = await createCollectionQuery(userId, parsed.data);

  revalidateCollectionViews();
  return { success: true, collection };
}

// Update a collection's metadata (name, description) from the Edit dialog.
// Validates with Zod, then delegates the owner-scoped write to the query layer.
// Returns the refreshed collection; a non-owner (or missing collection) gets
// "not found". The first Zod issue is surfaced as `error` for inline display.
export async function updateCollection(
  id: string,
  input: unknown,
): Promise<ActionResult<{ collection: CreatedCollection }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const collection = await updateCollectionQuery(userId, id, parsed.data);
  if (!collection) return { success: false, error: "Collection not found" };

  revalidateCollectionViews();
  return { success: true, collection };
}

// Delete a collection. The owner-scoped write lives in the query layer; a
// non-owner (or missing collection) deletes nothing and gets "not found". Only
// the collection and its item↔collection join rows are removed (cascade) — the
// items themselves are left intact.
export async function deleteCollection(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const deleted = await deleteCollectionQuery(userId, id);
  if (!deleted) return { success: false, error: "Collection not found" };

  revalidateCollectionViews();
  return { success: true };
}
