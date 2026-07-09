import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Standalone DB smoke test. Run with: npm run db:test
// Verifies connectivity and fetches + displays the seeded demo data so you can
// eyeball that `npm run db:seed` populated the database correctly.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@devstash.io";

// First non-empty line of a text body, truncated for display.
function preview(text: string | null, max = 60): string {
  if (!text) return "";
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  const trimmed = line.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — check your .env file.");
  }

  console.log("🔌 Testing connection...");
  await prisma.$queryRaw`SELECT 1`;
  console.log("✓ Connected to the database\n");

  // 1. System item types.
  const systemTypes = await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { name: "asc" },
  });
  console.log(`🏷️  System types (${systemTypes.length}): ${systemTypes.map((t) => t.name).join(", ")}\n`);

  // 2. Demo user.
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: {
      collections: {
        orderBy: { createdAt: "asc" },
        include: {
          defaultType: true,
          items: {
            orderBy: { addedAt: "asc" },
            include: { item: { include: { itemType: true } } },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error(`Demo user (${DEMO_EMAIL}) not found — run \`npm run db:seed\`.`);
  }

  const passwordOk = user.passwordHash
    ? await bcrypt.compare("12345678", user.passwordHash)
    : false;

  console.log("👤 Demo user");
  console.log(`   email:         ${user.email}`);
  console.log(`   name:          ${user.name}`);
  console.log(`   isPro:         ${user.isPro}`);
  console.log(`   emailVerified: ${user.emailVerified ? "yes" : "no"}`);
  console.log(`   password ok:   ${passwordOk ? "yes (12345678 ✓)" : "NO — hash mismatch"}\n`);

  // 3. Collections + items.
  let totalItems = 0;
  console.log(`📚 Collections (${user.collections.length})\n`);
  for (const collection of user.collections) {
    console.log(`   ▸ ${collection.name}  ·  ${collection.items.length} items  ·  default: ${collection.defaultType?.name ?? "—"}`);
    console.log(`     ${collection.description ?? ""}`);
    for (const link of collection.items) {
      const item = link.item;
      const detail = item.contentType === "URL" ? item.url : preview(item.content);
      console.log(`       - [${item.itemType.name}] ${item.title}  →  ${detail}`);
      totalItems++;
    }
    console.log("");
  }

  // 4. Sanity assertions.
  if (!passwordOk) throw new Error("Demo password does not validate.");
  if (user.collections.length === 0) throw new Error("No collections found for demo user.");
  if (totalItems === 0) throw new Error("No items found for demo user.");

  console.log(`✅ All checks passed — ${user.collections.length} collections, ${totalItems} items.`);
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
