// Data fetching for tags. Scoped to the authenticated user, whose id each
// function receives from the caller.

import { prisma } from "@/lib/prisma";

// Existing tag names for the given user, for the New Item dialog's tag
// autocomplete. When `query` is blank, returns the first `limit` tags (so
// focusing the field surfaces existing tags without typing); otherwise
// case-insensitively matches names containing the query. Alphabetical.
export async function searchTags(
  userId: string,
  query: string,
  limit = 10,
): Promise<string[]> {
  const q = query.trim();
  const tags = await prisma.tag.findMany({
    where: {
      userId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    take: limit,
    select: { name: true },
  });
  return tags.map((t) => t.name);
}
