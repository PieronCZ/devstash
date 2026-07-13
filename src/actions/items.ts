"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
