import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 requires a driver adapter. PrismaPg speaks the standard Postgres
// wire protocol and works with Neon's connection string. (For edge runtimes,
// swap to @prisma/adapter-neon + @neondatabase/serverless.)
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Reuse a single client across hot reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
