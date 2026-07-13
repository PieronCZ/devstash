"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ItemDetail } from "@/lib/db/items";
import { updateItem as updateItemQuery } from "@/lib/db/items";
import { updateItemSchema } from "@/lib/validations/items";

// Result shape shared by the item mutations — mirrors the project's
// { success, data, error } convention (data folded in on success).
type ActionResult<T = unknown> =
  | ({ success: true } & T)
  | { success: false; error: string };

// Re-render the surfaces that show item cards after a mutation. Client callers
// also `router.refresh()` for the current route; this covers the others.
function revalidateItemViews() {
  revalidatePath("/dashboard");
  revalidatePath("/items/[type]", "page");
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Flip an item's favorite flag. Scoped to the owner — a non-owner (or missing
// item) is reported as not found rather than mutated.
export async function toggleFavorite(
  id: string,
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { isFavorite: true },
  });
  if (!item) return { success: false, error: "Item not found" };

  const next = !item.isFavorite;
  await prisma.item.updateMany({
    where: { id, userId },
    data: { isFavorite: next },
  });

  revalidateItemViews();
  return { success: true, isFavorite: next };
}

// Flip an item's pinned flag. Same ownership scoping as favorites.
export async function togglePin(
  id: string,
): Promise<ActionResult<{ isPinned: boolean }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { isPinned: true },
  });
  if (!item) return { success: false, error: "Item not found" };

  const next = !item.isPinned;
  await prisma.item.updateMany({
    where: { id, userId },
    data: { isPinned: next },
  });

  revalidateItemViews();
  return { success: true, isPinned: next };
}

// Update an item's editable fields. Validates the payload with Zod (source of
// truth), then delegates the owner-scoped write to the query layer. Returns the
// refreshed detail so the drawer can update without a second fetch; the first
// Zod issue is surfaced as `error` for inline display.
export async function updateItem(
  id: string,
  input: unknown,
): Promise<ActionResult<{ item: ItemDetail }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const item = await updateItemQuery(userId, id, parsed.data);
  if (!item) return { success: false, error: "Item not found" };

  revalidateItemViews();
  return { success: true, item };
}

// Permanently delete an item. `deleteMany` scopes the write to the owner and
// returns a count, so a non-owner deletes nothing and gets "not found".
export async function deleteItem(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const { count } = await prisma.item.deleteMany({ where: { id, userId } });
  if (count === 0) return { success: false, error: "Item not found" };

  revalidateItemViews();
  return { success: true };
}
