import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// System item types (immutable, shared across all users → userId = null).
// Icons are lucide names; colors are hex. Mirrors the Type Colors & Icons
// table in context/project-overview.md.
const SYSTEM_ITEM_TYPES = [
  { name: "Snippet", icon: "Code", color: "#3b82f6" },
  { name: "Prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "Command", icon: "Terminal", color: "#f97316" },
  { name: "Note", icon: "StickyNote", color: "#fde047" },
  { name: "Link", icon: "Link", color: "#10b981" },
  { name: "File", icon: "File", color: "#6b7280" },
  { name: "Image", icon: "Image", color: "#ec4899" },
];

async function main() {
  for (const type of SYSTEM_ITEM_TYPES) {
    // `@@unique([name, userId])` does not enforce uniqueness when userId is
    // NULL (Postgres treats NULLs as distinct), so guard against duplicates
    // manually to keep the seed idempotent.
    const existing = await prisma.itemType.findFirst({
      where: { name: type.name, userId: null, isSystem: true },
    });

    if (existing) {
      await prisma.itemType.update({
        where: { id: existing.id },
        data: { icon: type.icon, color: type.color },
      });
      console.log(`↻ updated system type: ${type.name}`);
    } else {
      await prisma.itemType.create({
        data: { ...type, isSystem: true, userId: null },
      });
      console.log(`✓ created system type: ${type.name}`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
