import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { searchTags } from "@/lib/db/tags";

// GET /api/tags?q=<query>
// Returns the signed-in user's existing tag names matching `q` (or the first
// few when `q` is blank). Powers the New Item dialog's tag autocomplete.
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const tags = await searchTags(userId, query);
  return NextResponse.json(tags);
}
