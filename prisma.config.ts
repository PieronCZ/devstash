import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration. Env vars are no longer auto-loaded, so we import
// "dotenv/config" above to populate process.env for CLI commands.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
