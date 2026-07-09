import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type ContentType,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─────────────────────── Data ───────────────────────

const DEMO_EMAIL = "demo@devstash.io";

// System item types (immutable, shared → userId = null). Lowercase names.
const SYSTEM_ITEM_TYPES = [
  { name: "snippet", icon: "Code", color: "#3b82f6" },
  { name: "prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "command", icon: "Terminal", color: "#f97316" },
  { name: "note", icon: "StickyNote", color: "#fde047" },
  { name: "file", icon: "File", color: "#6b7280" },
  { name: "image", icon: "Image", color: "#ec4899" },
  { name: "link", icon: "Link", color: "#10b981" },
];

type SeedItem = {
  type: string; // system type name
  title: string;
  description?: string;
  content?: string; // TEXT items
  url?: string; // URL items
  language?: string;
};

type SeedCollection = {
  name: string;
  description: string;
  defaultType: string;
  items: SeedItem[];
};

const COLLECTIONS: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Reusable React patterns and hooks",
    defaultType: "snippet",
    items: [
      {
        type: "snippet",
        title: "useDebounce",
        description: "Debounce a fast-changing value",
        language: "ts",
        content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}`,
      },
      {
        type: "snippet",
        title: "Theme compound component",
        description: "Context provider + compound component pattern",
        language: "tsx",
        content: `import { createContext, useContext, useState } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
} | null>(null);

export function Theme({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

Theme.Toggle = function Toggle() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("Theme.Toggle must be used within <Theme>");
  return <button onClick={ctx.toggle}>Theme: {ctx.theme}</button>;
};`,
      },
      {
        type: "snippet",
        title: "cn() class merge utility",
        description: "Merge Tailwind classes with clsx + tailwind-merge",
        language: "ts",
        content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      },
    ],
  },
  {
    name: "AI Workflows",
    description: "AI prompts and workflow automations",
    defaultType: "prompt",
    items: [
      {
        type: "prompt",
        title: "Code review prompt",
        description: "Structured PR review",
        content: `You are a senior engineer reviewing a pull request. Review the diff below for:
1. Correctness and edge cases
2. Security (auth, input validation, injection)
3. Performance (N+1 queries, unnecessary re-renders)
4. Readability and naming

For each issue give: severity, file:line, why it matters, and a concrete fix. Diff:

<diff>`,
      },
      {
        type: "prompt",
        title: "Documentation generation prompt",
        description: "Generate docs from source",
        content: `Generate concise developer documentation for the following module. Include: a one-line summary, parameters/returns, a minimal usage example, and any gotchas. Keep it under 200 words. Code:

<code>`,
      },
      {
        type: "prompt",
        title: "Refactoring assistance prompt",
        description: "Suggest safe refactors",
        content: `Refactor the code below for readability and testability without changing behavior. Explain each change in one sentence and preserve the public API. Return the full refactored code, then a bullet list of what changed. Code:

<code>`,
      },
    ],
  },
  {
    name: "DevOps",
    description: "Infrastructure and deployment resources",
    defaultType: "snippet",
    items: [
      {
        type: "snippet",
        title: "Next.js multi-stage Dockerfile",
        description: "Slim production image",
        language: "dockerfile",
        content: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]`,
      },
      {
        type: "command",
        title: "Deploy to production",
        description: "Run migrations then deploy",
        language: "bash",
        content: `npx prisma migrate deploy && vercel deploy --prod`,
      },
      {
        type: "link",
        title: "Docker Documentation",
        description: "Official Docker docs",
        url: "https://docs.docker.com/",
      },
      {
        type: "link",
        title: "GitHub Actions Documentation",
        description: "CI/CD workflows reference",
        url: "https://docs.github.com/en/actions",
      },
    ],
  },
  {
    name: "Terminal Commands",
    description: "Useful shell commands for everyday development",
    defaultType: "command",
    items: [
      {
        type: "command",
        title: "Undo last commit (keep changes)",
        description: "Git operations",
        language: "bash",
        content: `git reset --soft HEAD~1`,
      },
      {
        type: "command",
        title: "Remove all stopped containers",
        description: "Docker cleanup",
        language: "bash",
        content: `docker container prune -f`,
      },
      {
        type: "command",
        title: "Find and kill process on a port",
        description: "Process management",
        language: "bash",
        content: `lsof -ti :3000 | xargs kill -9`,
      },
      {
        type: "command",
        title: "Show outdated npm packages",
        description: "Package manager utilities",
        language: "bash",
        content: `npm outdated`,
      },
    ],
  },
  {
    name: "Design Resources",
    description: "UI/UX resources and references",
    defaultType: "link",
    items: [
      {
        type: "link",
        title: "Tailwind CSS Docs",
        description: "CSS/Tailwind reference",
        url: "https://tailwindcss.com/docs",
      },
      {
        type: "link",
        title: "shadcn/ui",
        description: "Component library",
        url: "https://ui.shadcn.com",
      },
      {
        type: "link",
        title: "Material Design 3",
        description: "Design system reference",
        url: "https://m3.material.io",
      },
      {
        type: "link",
        title: "Lucide Icons",
        description: "Icon library",
        url: "https://lucide.dev/icons",
      },
    ],
  },
];

// Map a system type name to the ContentType enum for storage.
function contentTypeFor(typeName: string): ContentType {
  if (typeName === "link") return "URL";
  if (typeName === "file" || typeName === "image") return "FILE";
  return "TEXT";
}

// ─────────────────────── Seed ───────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. Reset demo data so re-runs stay clean. Deleting the demo user cascades
  //    to their items, collections, and join rows, which frees the system
  //    types to be safely deleted and re-created.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  await prisma.itemType.deleteMany({ where: { isSystem: true } });

  // 2. System item types.
  const typesByName = new Map<string, string>();
  for (const type of SYSTEM_ITEM_TYPES) {
    const created = await prisma.itemType.create({
      data: { ...type, isSystem: true, userId: null },
    });
    typesByName.set(type.name, created.id);
  }
  console.log(`✓ Created ${SYSTEM_ITEM_TYPES.length} system item types`);

  // 3. Demo user with a bcrypt-hashed password (12 rounds).
  const passwordHash = await bcrypt.hash("12345678", 12);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      isPro: false,
      emailVerified: new Date(),
      passwordHash,
    },
  });
  console.log(`✓ Created demo user (${user.email})`);

  // 4. Collections + items.
  let itemCount = 0;
  for (const col of COLLECTIONS) {
    const collection = await prisma.collection.create({
      data: {
        name: col.name,
        description: col.description,
        userId: user.id,
        defaultTypeId: typesByName.get(col.defaultType),
      },
    });

    for (const item of col.items) {
      const itemTypeId = typesByName.get(item.type);
      if (!itemTypeId) throw new Error(`Unknown item type: ${item.type}`);

      const created = await prisma.item.create({
        data: {
          title: item.title,
          description: item.description,
          contentType: contentTypeFor(item.type),
          content: item.content ?? null,
          url: item.url ?? null,
          language: item.language ?? null,
          userId: user.id,
          itemTypeId,
        },
      });

      await prisma.itemCollection.create({
        data: { itemId: created.id, collectionId: collection.id },
      });
      itemCount++;
    }

    console.log(`✓ ${col.name} — ${col.items.length} items`);
  }

  console.log(
    `\n✅ Seed complete: 1 user, ${SYSTEM_ITEM_TYPES.length} types, ${COLLECTIONS.length} collections, ${itemCount} items.`,
  );
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
