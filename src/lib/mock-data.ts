// Single source of truth for mock dashboard data.
// Temporary — used to render the dashboard UI until the database is wired up.

export type ContentType = "TEXT" | "FILE" | "URL";

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isPro: boolean;
}

export interface ItemType {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // hex, used for card borders/backgrounds
  kind: ContentType;
  route: string;
  isPro: boolean;
  itemCount: number; // total shown in the sidebar
}

export interface Item {
  id: string;
  title: string;
  typeId: string;
  contentType: ContentType;
  content: string | null; // TEXT items
  url: string | null; // URL items
  fileName: string | null; // FILE items
  fileSize: number | null; // bytes, FILE items
  description: string | null;
  language: string | null;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  collectionIds: string[];
  updatedAt: string; // ISO date
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  defaultTypeId: string; // drives the accent color
  isFavorite: boolean;
  itemCount: number;
  updatedAt: string; // ISO date
}

// ───────────────────────── Current user ─────────────────────────

export const currentUser: User = {
  id: "user_1",
  name: "Devon Sinclair",
  email: "devon@devstash.io",
  image: null,
  isPro: false,
};

// ───────────────────────── Item types ─────────────────────────

export const itemTypes: ItemType[] = [
  { id: "type_snippet", name: "Snippets", icon: "Code", color: "#3b82f6", kind: "TEXT", route: "/items/snippets", isPro: false, itemCount: 42 },
  { id: "type_prompt", name: "Prompts", icon: "Sparkles", color: "#8b5cf6", kind: "TEXT", route: "/items/prompts", isPro: false, itemCount: 24 },
  { id: "type_command", name: "Commands", icon: "Terminal", color: "#f97316", kind: "TEXT", route: "/items/commands", isPro: false, itemCount: 31 },
  { id: "type_note", name: "Notes", icon: "StickyNote", color: "#fde047", kind: "TEXT", route: "/items/notes", isPro: false, itemCount: 18 },
  { id: "type_link", name: "Links", icon: "Link", color: "#10b981", kind: "URL", route: "/items/links", isPro: false, itemCount: 42 },
  { id: "type_file", name: "Files", icon: "File", color: "#6b7280", kind: "FILE", route: "/items/files", isPro: true, itemCount: 7 },
  { id: "type_image", name: "Images", icon: "Image", color: "#ec4899", kind: "FILE", route: "/items/images", isPro: true, itemCount: 9 },
];

// ───────────────────────── Collections ─────────────────────────

export const collections: Collection[] = [
  {
    id: "col_react",
    name: "React Patterns",
    description: "Hooks, composition tricks, and rendering patterns I reach for.",
    defaultTypeId: "type_snippet",
    isFavorite: true,
    itemCount: 18,
    updatedAt: "2026-07-03T12:00:00Z",
  },
  {
    id: "col_prompts",
    name: "AI Prompt Library",
    description: "System prompts and prompt scaffolds for coding agents.",
    defaultTypeId: "type_prompt",
    isFavorite: true,
    itemCount: 24,
    updatedAt: "2026-07-03T09:00:00Z",
  },
  {
    id: "col_shell",
    name: "Shell & Git",
    description: "Terminal one-liners I always forget.",
    defaultTypeId: "type_command",
    isFavorite: false,
    itemCount: 31,
    updatedAt: "2026-07-02T14:00:00Z",
  },
  {
    id: "col_interview",
    name: "Interview Prep",
    description: "Algorithms, notes, and talking points.",
    defaultTypeId: "type_note",
    isFavorite: false,
    itemCount: 12,
    updatedAt: "2026-07-01T14:00:00Z",
  },
  {
    id: "col_reading",
    name: "Reading List",
    description: "Articles, docs, and references worth revisiting.",
    defaultTypeId: "type_link",
    isFavorite: true,
    itemCount: 42,
    updatedAt: "2026-06-30T14:00:00Z",
  },
  {
    id: "col_context",
    name: "Context Files",
    description: "Docs and boilerplates I feed to models.",
    defaultTypeId: "type_file",
    isFavorite: false,
    itemCount: 7,
    updatedAt: "2026-06-26T14:00:00Z",
  },
];

// ───────────────────────── Items ─────────────────────────

export const items: Item[] = [
  {
    id: "item_usedebounce",
    title: "useDebounce hook",
    typeId: "type_snippet",
    contentType: "TEXT",
    content:
      'import { useEffect, useState } from "react";\n\nexport function useDebounce<T>(value: T, delay = 300): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(id);\n  }, [value, delay]);\n  return debounced;\n}',
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: "typescript",
    tags: ["react", "hooks", "typescript"],
    isFavorite: true,
    isPinned: true,
    collectionIds: ["col_react"],
    updatedAt: "2026-07-03T13:00:00Z",
  },
  {
    id: "item_senior_reviewer",
    title: "Senior code reviewer",
    typeId: "type_prompt",
    contentType: "TEXT",
    content:
      "You are a senior staff engineer reviewing a pull request.\nFocus on correctness, edge cases, and readability. Be concise and specific.",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: null,
    tags: ["ai", "review", "system-prompt"],
    isFavorite: false,
    isPinned: true,
    collectionIds: ["col_prompts"],
    updatedAt: "2026-07-03T11:00:00Z",
  },
  {
    id: "item_undo_commit",
    title: "Undo last git commit (keep changes)",
    typeId: "type_command",
    contentType: "TEXT",
    content: "git reset --soft HEAD~1",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: "bash",
    tags: ["git", "terminal"],
    isFavorite: true,
    isPinned: false,
    collectionIds: ["col_shell"],
    updatedAt: "2026-07-03T10:00:00Z",
  },
  {
    id: "item_debounce_throttle",
    title: "Debounce vs throttle",
    typeId: "type_note",
    contentType: "TEXT",
    content:
      "Debounce: wait until activity stops, then fire once. Good for search inputs.\nThrottle: fire at most once per interval. Good for scroll / resize handlers.",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: null,
    tags: ["performance", "concepts"],
    isFavorite: false,
    isPinned: false,
    collectionIds: ["col_react", "col_interview"],
    updatedAt: "2026-07-03T09:30:00Z",
  },
  {
    id: "item_nextjs_docs",
    title: "Next.js App Router docs",
    typeId: "type_link",
    contentType: "URL",
    content: null,
    url: "https://nextjs.org/docs/app",
    fileName: null,
    fileSize: null,
    description: null,
    language: null,
    tags: ["nextjs", "docs"],
    isFavorite: true,
    isPinned: false,
    collectionIds: ["col_reading"],
    updatedAt: "2026-07-03T08:00:00Z",
  },
  {
    id: "item_kill_port",
    title: "Kill process on a port",
    typeId: "type_command",
    contentType: "TEXT",
    content: "lsof -ti:3000 | xargs kill -9",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: "bash",
    tags: ["terminal", "macos"],
    isFavorite: false,
    isPinned: false,
    collectionIds: ["col_shell"],
    updatedAt: "2026-07-02T18:00:00Z",
  },
  {
    id: "item_tailwind_cheatsheet",
    title: "Tailwind cheat sheet",
    typeId: "type_file",
    contentType: "FILE",
    content: null,
    url: null,
    fileName: "tailwind-cheatsheet.pdf",
    fileSize: 253952,
    description: null,
    language: null,
    tags: ["tailwind", "reference"],
    isFavorite: false,
    isPinned: false,
    collectionIds: ["col_context"],
    updatedAt: "2026-07-02T16:00:00Z",
  },
  {
    id: "item_optimize_prompt",
    title: "Optimize this prompt for clarity",
    typeId: "type_prompt",
    contentType: "TEXT",
    content:
      "Rewrite the following prompt to be clearer and more specific.\nPreserve intent, remove ambiguity, and add missing constraints.",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: null,
    tags: ["ai", "meta"],
    isFavorite: true,
    isPinned: false,
    collectionIds: ["col_prompts"],
    updatedAt: "2026-07-02T15:00:00Z",
  },
  {
    id: "item_fetch_timeout",
    title: "Fetch with timeout",
    typeId: "type_snippet",
    contentType: "TEXT",
    content:
      "export async function fetchWithTimeout(url: string, ms = 5000) {\n  const controller = new AbortController();\n  const id = setTimeout(() => controller.abort(), ms);\n  try {\n    return await fetch(url, { signal: controller.signal });\n  } finally {\n    clearTimeout(id);\n  }\n}",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: "typescript",
    tags: ["fetch", "typescript"],
    isFavorite: false,
    isPinned: false,
    collectionIds: ["col_react"],
    updatedAt: "2026-07-02T13:00:00Z",
  },
  {
    id: "item_bigo_cheatsheet",
    title: "Big-O cheat sheet",
    typeId: "type_note",
    contentType: "TEXT",
    content: "O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n) < O(n!)",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: null,
    tags: ["algorithms", "interview"],
    isFavorite: false,
    isPinned: false,
    collectionIds: ["col_interview"],
    updatedAt: "2026-07-02T11:00:00Z",
  },
  {
    id: "item_git_squash",
    title: "Squash last 3 commits",
    typeId: "type_command",
    contentType: "TEXT",
    content: "git rebase -i HEAD~3",
    url: null,
    fileName: null,
    fileSize: null,
    description: null,
    language: "bash",
    tags: ["git", "terminal"],
    isFavorite: false,
    isPinned: false,
    collectionIds: ["col_shell"],
    updatedAt: "2026-07-01T17:00:00Z",
  },
  {
    id: "item_prisma_docs",
    title: "Prisma schema reference",
    typeId: "type_link",
    contentType: "URL",
    content: null,
    url: "https://www.prisma.io/docs/orm/prisma-schema",
    fileName: null,
    fileSize: null,
    description: null,
    language: null,
    tags: ["prisma", "database"],
    isFavorite: false,
    isPinned: false,
    collectionIds: ["col_reading"],
    updatedAt: "2026-07-01T15:00:00Z",
  },
];
