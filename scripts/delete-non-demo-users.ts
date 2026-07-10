import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Delete every user (and all their content) except the demo account.
 *
 * User-owned relations (items, collections, custom item types, tags, NextAuth
 * accounts & sessions) are removed automatically via `onDelete: Cascade`.
 * VerificationToken has no FK to User, so stray tokens are cleaned separately.
 *
 * Safe by default: prints what it *would* delete and exits. Pass `--confirm`
 * to actually delete. Targets whatever DATABASE_URL is loaded (.env = dev).
 *
 *   npm run db:prune-users            # dry run
 *   npm run db:prune-users -- --confirm
 */
const KEEP_EMAIL = "demo@devstash.io";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — check your .env file.");
  }

  const confirm = process.argv.includes("--confirm");

  const users = await prisma.user.findMany({
    where: { email: { not: KEEP_EMAIL } },
    select: {
      email: true,
      _count: {
        select: { items: true, collections: true, itemTypes: true, tags: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log(`Nothing to delete — only ${KEEP_EMAIL} is present.`);
    return;
  }

  console.log(`Found ${users.length} user(s) to delete (keeping ${KEEP_EMAIL}):`);
  for (const u of users) {
    const { items, collections, itemTypes, tags } = u._count;
    console.log(
      `  - ${u.email}  [items: ${items}, collections: ${collections}, ` +
        `customTypes: ${itemTypes}, tags: ${tags}]`,
    );
  }

  if (!confirm) {
    console.log("\nDry run — no changes made. Re-run with --confirm to delete.");
    return;
  }

  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { not: KEEP_EMAIL } },
  });
  const deletedTokens = await prisma.verificationToken.deleteMany({
    where: { identifier: { not: KEEP_EMAIL } },
  });

  console.log(
    `\nDeleted ${deletedUsers.count} user(s) and ` +
      `${deletedTokens.count} stray verification token(s). Kept ${KEEP_EMAIL}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
