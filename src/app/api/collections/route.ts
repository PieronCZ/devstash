import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserCollections } from "@/lib/db/collections";

// GET /api/collections
// Returns the signed-in user's collections (id + name) for the item forms'
// collection picker.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const collections = await getUserCollections(userId);
  return NextResponse.json(collections);
}
