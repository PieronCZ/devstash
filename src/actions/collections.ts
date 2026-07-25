"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { ActionResult } from "@/actions/types";
import {
  createCollection as createCollectionQuery,
  type CreatedCollection,
} from "@/lib/db/collections";
import { createCollectionSchema } from "@/lib/validations/collections";

// Re-render the surfaces that show collections after a mutation. Client callers
// also `router.refresh()` for the current route; this covers the sidebar
// (rendered in the shared layout) and the dashboard/items grids.
function revalidateCollectionViews() {
  revalidatePath("/dashboard");
  revalidatePath("/items/[type]", "page");
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
