import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/account/delete
// Permanently deletes the signed-in user. `onDelete: Cascade` on user-owned
// relations removes their items, collections, tags, custom types, and NextAuth
// accounts/sessions. The client signs out afterwards.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // deleteMany avoids a throw if the account was already removed.
  await prisma.user.deleteMany({ where: { id: session.user.id } });

  return NextResponse.json({ message: "Account deleted." }, { status: 200 });
}
