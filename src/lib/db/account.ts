// Account-related reads for the settings page. All Prisma access lives here so
// the page stays a thin server component.

import { prisma } from "@/lib/prisma";

// Whether the user signs in with a password (a credentials account). OAuth-only
// accounts have no `passwordHash`, so the settings page hides the change-password
// card for them. Returns false when the user can't be found.
export async function getUserHasPassword(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  return !!user?.passwordHash;
}
