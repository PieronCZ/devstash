import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Standalone DB smoke test. Run with: npm run db:test
// Verifies connectivity, that system types are seeded, and that a full
// create → read → cascade-delete round-trip works against the dev branch.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — check your .env file.");
  }

  console.log("🔌 Testing connection...");
  await prisma.$queryRaw`SELECT 1`;
  console.log("✓ Connected to the database\n");

  // 1. System types should be seeded.
  console.log("🏷️  Checking system item types...");
  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
  });
  console.log(`✓ Found ${systemTypes.length} system types: ${systemTypes.map((t) => t.name).join(", ")}\n`);

  // 2. Create → read → delete round-trip (proves writes + cascade deletes).
  const snippetType = systemTypes.find((t) => t.name === "Snippet");
  if (!snippetType) throw new Error("Snippet system type missing — run `npm run db:seed`.");

  console.log("✍️  Creating a throwaway user with an item and a collection...");
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@devstash.local`,
      name: "DB Test User",
      items: {
        create: {
          title: "Hello from test-db",
          contentType: "TEXT",
          content: "console.log('it works')",
          language: "ts",
          itemTypeId: snippetType.id,
        },
      },
      collections: {
        create: { name: "Test Collection" },
      },
    },
    include: { items: true, collections: true },
  });
  console.log(`✓ Created user ${user.id} with ${user.items.length} item(s) and ${user.collections.length} collection(s)`);

  // Link the item to the collection via the join table.
  await prisma.itemCollection.create({
    data: { itemId: user.items[0].id, collectionId: user.collections[0].id },
  });
  const links = await prisma.itemCollection.count({ where: { collectionId: user.collections[0].id } });
  console.log(`✓ Linked item ↔ collection (join rows: ${links})`);

  // Deleting the user should cascade to items, collections, and join rows.
  console.log("🧹 Deleting the test user (cascade)...");
  await prisma.user.delete({ where: { id: user.id } });

  const leftoverItems = await prisma.item.count({ where: { userId: user.id } });
  const leftoverCollections = await prisma.collection.count({ where: { userId: user.id } });
  const leftoverLinks = await prisma.itemCollection.count({ where: { itemId: user.items[0].id } });

  if (leftoverItems || leftoverCollections || leftoverLinks) {
    throw new Error(
      `Cascade delete failed — items:${leftoverItems} collections:${leftoverCollections} links:${leftoverLinks}`,
    );
  }
  console.log("✓ Cascade delete removed items, collections, and join rows\n");

  console.log("✅ All database checks passed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Database test failed:\n", e);
    await prisma.$disconnect();
    process.exit(1);
  });
