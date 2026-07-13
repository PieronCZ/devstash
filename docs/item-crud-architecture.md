# Item CRUD Architecture

A unified design for creating, reading, updating, and deleting items across all
7 system types (snippet, prompt, note, command, link, file, image) with **one
mutation surface**, **direct DB reads from server components**, **one dynamic
route**, and **shared components that adapt by type**.

> **Status:** Design / proposal (not yet implemented). Grounded in the patterns
> already in the codebase — `src/lib/db/*`, `src/lib/validations/*`, the
> `{ success, data, error }` action convention, and the `ContentType`-driven
> storage model.

## Sources

- [context/project-overview.md](../context/project-overview.md) — data model, features, type table
- [docs/item-types.md](./item-types.md) — the 7 types + text/url/file classification
- [prisma/schema.prisma](../prisma/schema.prisma) — `Item`, `ItemType`, `ContentType`
- [src/lib/db/items.ts](../src/lib/db/items.ts) — existing query patterns
- [context/coding-standards.md](../context/coding-standards.md) — Server Actions, Zod, file organization

> **Note:** The research prompt cited `@docs/content-types.md` and
> `@src/lib/constants.tsx`. Those exact paths don't exist — the equivalents are
> [docs/item-types.md](./item-types.md) and
> [src/lib/item-types.ts](../src/lib/item-types.ts) (order + Pro gating).

---

## Guiding Principles

1. **One mutation file, not seven.** A single `src/actions/items.ts` holds
   `createItem` / `updateItem` / `deleteItem` (+ small toggles). Every type flows
   through the same actions — the type is just data (`itemTypeId` +
   `contentType`), never a separate code path.
2. **Reads live in `lib/db`, called directly from server components.** No API
   routes for page data (per coding standards: "fetch data directly in server
   components"). API routes are reserved for webhooks / presigned uploads.
3. **One dynamic route.** `/items/[type]` renders the list for any type;
   `/items/[type]/[id]` (or a drawer) renders one item. The route reads the
   `[type]` segment, validates it, and hands a `type` descriptor to shared
   components.
4. **Type-specific logic lives in components, not actions.** The action persists
   whatever fields it's given (validated by a discriminated Zod schema); the
   **editor/preview components** decide _which fields to show_ per content kind.

---

## File Structure

```
src/
├── actions/
│   └── items.ts                 # 'use server' — create/update/delete + toggles
│                                #   (the ONLY item mutation surface)
├── lib/
│   ├── db/
│   │   └── items.ts             # queries: getItemsByType, getItemById,
│   │                            #   getItemStats, … (server-component reads)
│   ├── validations/
│   │   └── items.ts             # Zod: discriminated union on contentType
│   └── item-types.ts            # SYSTEM_TYPE_ORDER, PRO_TYPES (exists)
├── app/
│   └── items/
│       └── [type]/
│           ├── page.tsx         # LIST — one route for all 7 types
│           ├── loading.tsx      # skeleton
│           ├── not-found.tsx     # invalid [type] segment
│           └── [id]/
│               └── page.tsx     # DETAIL (or a parallel/intercepting route
│                                #   for the drawer)
└── components/
    └── items/
        ├── ItemList.tsx         # grid of ItemCard (reuses dashboard ItemCard)
        ├── ItemDrawer.tsx       # quick-open drawer shell (client)
        ├── ItemForm.tsx         # create/edit shell — picks the editor by kind
        ├── editors/
        │   ├── TextItemFields.tsx   # snippet/prompt/note/command (+ language)
        │   ├── UrlItemFields.tsx    # link
        │   └── FileItemFields.tsx   # file/image (presigned upload — Pro)
        └── ItemActionsMenu.tsx  # pin/favorite/delete (client, calls actions)
```

**Why this split** mirrors the existing codebase: `lib/db/*` already holds
read-only query functions returning typed shapes; `lib/validations/auth.ts`
already centralizes Zod schemas; components already live under
`components/[feature]/`. Actions are the one new folder the coding standards
already name (`src/actions/[feature].ts`) but that doesn't exist yet.

---

## Routing: how `/items/[type]` works

The `[type]` segment is the **lowercase system-type name** (`snippet`,
`command`, …) — matching the route table in
[project-overview.md](../context/project-overview.md) (`/items/snippets`, etc.)
and the sidebar links already pointing at `/items/[name]`.

> **Naming decision to make:** the sidebar/overview use **plural** routes
> (`/items/snippets`) while type names are stored **singular** (`snippet`). Pick
> one and normalize in the route: either store a `singular → plural` map, or
> route on the singular name. The list below assumes the segment is normalized
> to the singular type name before lookup.

```tsx
// src/app/items/[type]/page.tsx  (server component)
import { notFound } from "next/navigation";
import { getSystemTypeByName } from "@/lib/db/items";
import { getItemsByType } from "@/lib/db/items";
import { ItemList } from "@/components/items/ItemList";

export default async function ItemsByTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  // 1. Validate the segment against the known system types.
  const itemType = await getSystemTypeByName(type); // null → 404
  if (!itemType) notFound();

  // 2. Read this user's items of that type (direct DB, no API route).
  const items = await getItemsByType(itemType.id);

  // 3. Hand the resolved type + items to a shared, type-agnostic component.
  return <ItemList type={itemType} items={items} />;
}
```

Flow:

1. **Validate** — resolve `[type]` to a real `ItemType` row (or `notFound()`).
   Validating against the DB (or against `SYSTEM_TYPE_ORDER`) keeps arbitrary
   segments from reaching queries.
2. **Fetch** — `getItemsByType()` in `lib/db/items.ts`, scoped to the current
   user (today `DEMO_EMAIL`; later the session user id).
3. **Render** — pass the `ItemType` descriptor down. Components read
   `type.color` / `type.icon` / `contentType` to adapt; the route itself has **no
   per-type branches**.

Detail view (`[id]`) — or an intercepting route rendering `ItemDrawer` — fetches
one item with `getItemById(id)`, enforcing ownership in the query `where`.

---

## Where type-specific logic lives (components, not actions)

The **content kind** (`TEXT` / `URL` / `FILE`, see
[item-types.md](./item-types.md)) is the switch point, and it's resolved in the
**UI layer**:

| Kind   | Types                          | Editor component     | Fields shown                         |
| ------ | ------------------------------ | -------------------- | ------------------------------------ |
| `TEXT` | snippet, prompt, note, command | `TextItemFields`     | `content` (+ `language` for code)    |
| `URL`  | link                           | `UrlItemFields`      | `url`                                |
| `FILE` | file, image (Pro)              | `FileItemFields`     | upload → `fileUrl`/`fileName`/`fileSize` |

`ItemForm` maps the type's kind to the right editor (a `switch (contentType)`),
and `ItemCard`/`ItemPreview` (already in `components/dashboard/ItemCard.tsx`)
already branch on `contentType`/`language` for the preview. The **actions stay
kind-agnostic** — they receive a validated payload and persist it; they don't
know or care that a `snippet` shows a code block and a `link` shows a URL.

This keeps the rule from the prompt: _type-specific logic in components, not
actions._

---

## Mutations: `src/actions/items.ts`

One `'use server'` file. Every action:

1. Resolves the session user (`auth()`), returns an error if unauthenticated.
2. Validates input with a **discriminated-union Zod schema** keyed on
   `contentType` (so each kind requires only its own payload fields).
3. Enforces ownership on update/delete (`where: { id, userId }`).
4. Returns the shared `{ success, data?, error? }` shape (coding standards).
5. Calls `revalidatePath('/items/[type]')` / `/dashboard` so server-rendered
   lists refresh.

```ts
// src/actions/items.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createItemSchema, updateItemSchema } from "@/lib/validations/items";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createItem(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // parsed.data is a discriminated union — contentType decides which payload
  // fields are present. Actions persist; they don't branch on presentation.
  const item = await prisma.item.create({
    data: { ...parsed.data, userId: session.user.id },
    select: { id: true },
  });

  revalidatePath("/items");
  revalidatePath("/dashboard");
  return { success: true, data: item };
}

// updateItem(id, input): same shape, ownership-guarded (where: { id, userId }).
// deleteItem(id):        ownership-guarded prisma.item.delete / deleteMany.
// Small toggles:         togglePin(id), toggleFavorite(id) — thin wrappers.
```

**Validation (`src/lib/validations/items.ts`)** — a discriminated union means one
schema covers all 7 types without per-type action code:

```ts
import { z } from "zod";

const base = { title: z.string().trim().min(1).max(200),
               description: z.string().trim().max(1000).optional(),
               itemTypeId: z.string().cuid(),
               tags: z.array(z.string().trim()).optional() };

export const createItemSchema = z.discriminatedUnion("contentType", [
  z.object({ ...base, contentType: z.literal("TEXT"),
             content: z.string().min(1), language: z.string().optional() }),
  z.object({ ...base, contentType: z.literal("URL"),  url: z.string().url() }),
  z.object({ ...base, contentType: z.literal("FILE"),
             fileUrl: z.string().url(), fileName: z.string(), fileSize: z.number().int().positive() }),
]);
```

The `FILE` branch is created **after** the presigned R2 upload (the existing
upload flow in [project-overview.md](../context/project-overview.md)) — the
client uploads to R2, then calls `createItem` with the resulting
`fileUrl`/`fileName`/`fileSize`. File/image creation is additionally Pro-gated
(`PRO_TYPES` in `src/lib/item-types.ts`) and quota-checked in the action layer.

---

## Reads: `src/lib/db/items.ts` (additions)

The file already exports `getPinnedItems`, `getRecentItems`, `getItemStats`,
`getSidebarItemTypes`, and the `DashboardItem` shape + `itemSelect`. The CRUD
system reuses those and adds:

| Function                         | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `getSystemTypeByName(name)`      | Resolve `[type]` segment → `ItemType` (or `null`)    |
| `getItemsByType(itemTypeId)`     | List a user's items of one type (reuses `itemSelect`)|
| `getItemById(id)`                | One item for the detail/drawer, ownership-scoped     |

All follow the existing conventions: scoped to the current user, reuse the
shared `itemSelect` + `toDashboardItem` mapper, return the `DashboardItem` shape
so `ItemCard` renders them unchanged. When auth is fully wired, swap the
`DEMO_EMAIL` filter for the session user id in one place (a small
`currentUserId()` helper would centralize this).

---

## Component Responsibilities

| Component              | Client? | Responsibility                                                      |
| ---------------------- | :-----: | ------------------------------------------------------------------ |
| `items/[type]/page`    |   no    | Validate segment, fetch by type, render `ItemList`                 |
| `items/[type]/[id]`    |   no    | Fetch one item (owned), render detail/drawer                       |
| `ItemList`             |   no    | Grid layout; maps items → `ItemCard`. Type-agnostic                |
| `ItemCard` (exists)    |   no    | Card chrome + per-`contentType` preview (already implemented)      |
| `ItemDrawer`           |   yes   | Quick-open drawer shell; hosts `ItemForm` for create/edit          |
| `ItemForm`             |   yes   | Form shell; `switch(contentType)` → correct editor; calls actions  |
| `TextItemFields`       |   yes   | `content` textarea/Markdown + optional `language`                  |
| `UrlItemFields`        |   yes   | `url` input + validation                                           |
| `FileItemFields`       |   yes   | Presigned upload → sets `fileUrl`/`fileName`/`fileSize` (Pro)      |
| `ItemActionsMenu`      |   yes   | Pin / favorite / delete; calls the toggle & delete actions         |

**Separation of concerns:**

- **Route** = validate + fetch + delegate (no type branches).
- **Read layer (`lib/db`)** = ownership-scoped queries, typed shapes.
- **Action layer (`actions/items.ts`)** = auth + Zod + persist + revalidate;
  **kind-agnostic**.
- **Components** = the _only_ place that knows a snippet looks different from a
  link (which fields, which preview) — driven entirely by `contentType`.

---

## Request Flow (create, end to end)

```
User (drawer) → ItemForm picks editor by contentType
             → collects validated fields
             → createItem(input)  [server action]
                 ├─ auth() → user id
                 ├─ createItemSchema.safeParse (discriminated union)
                 ├─ prisma.item.create({ ...data, userId })
                 └─ revalidatePath('/items', '/dashboard')
             ← { success, data:{ id } }
Server re-renders /items/[type] via lib/db read → new ItemCard appears
```

Read flow is simpler: the server component calls `getItemsByType()` directly —
no action, no API route, no client fetch.

---

## Open Decisions

- **Route naming:** plural URLs (`/items/snippets`) vs. singular type names
  (`/items/snippet`). Normalize in the route segment either way.
- **Detail view:** dedicated `[id]` page vs. intercepting route for the drawer
  (the spec favors a quick-access **drawer**, so an intercepting/parallel route
  is the natural fit).
- **Tags:** connect-or-create per-user tags inside `createItem`/`updateItem`
  (out of scope here but flows through the same action).
- **Quotas & Pro gating:** enforced in the action layer (50 items Free,
  file/image = Pro) — kept open in dev per the monetization plan.
