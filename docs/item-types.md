# Item Types

Reference for DevStash's 7 built-in **system item types** — their identity
(name, icon, color), purpose, and the storage fields each one uses.

> **Scope:** This documents the immutable system types seeded for every
> environment. Custom (user-created) types are a Pro/later feature and are not
> covered here.

## Sources

- [context/project-overview.md](../context/project-overview.md) — feature spec, type table
- [prisma/schema.prisma](../prisma/schema.prisma) — `Item`, `ItemType`, `ContentType`
- [prisma/seed.ts](../prisma/seed.ts) — system-type seed + `contentTypeFor()`
- [src/lib/item-types.ts](../src/lib/item-types.ts) — canonical order + Pro gating
- [src/lib/icons.ts](../src/lib/icons.ts) — icon-name → component map
- [src/components/dashboard/ItemCard.tsx](../src/components/dashboard/ItemCard.tsx) — per-type rendering

> **Note:** The research prompt referenced `src/lib/constants.tsx`, which does not
> exist. Type metadata actually lives in `src/lib/item-types.ts` (order + Pro
> gating), `src/lib/icons.ts` (icon map), and is seeded from `prisma/seed.ts`.

---

## Overview Table

| Swatch | Type      | Icon (lucide) | Hex color | Content kind | ContentType | Plan | Route             |
| :----: | --------- | ------------- | --------- | ------------ | ----------- | ---- | ----------------- |
|   🔵   | `snippet` | `Code`        | `#3b82f6` | text         | `TEXT`      | Free | `/items/snippets` |
|   🟣   | `prompt`  | `Sparkles`    | `#8b5cf6` | text         | `TEXT`      | Free | `/items/prompts`  |
|   🟠   | `command` | `Terminal`    | `#f97316` | text         | `TEXT`      | Free | `/items/commands` |
|   🟡   | `note`    | `StickyNote`  | `#fde047` | text         | `TEXT`      | Free | `/items/notes`    |
|   🟢   | `link`    | `Link`        | `#10b981` | url          | `URL`       | Free | `/items/links`    |
|   ⚪   | `file`    | `File`        | `#6b7280` | file         | `FILE`      | Pro  | `/items/files`    |
|   🩷   | `image`   | `Image`       | `#ec4899` | file         | `FILE`      | Pro  | `/items/images`   |

**Canonical display order** (`SYSTEM_TYPE_ORDER` in `src/lib/item-types.ts`):
snippet → prompt → command → note → link → file → image. Unknown types are
appended after these in name order by callers.

**Pro-gated types** (`PRO_TYPES`): `file`, `image` — flagged with a PRO badge in
the sidebar UI.

---

## Per-Type Detail

### 🔵 snippet

- **Icon:** `Code` · **Color:** `#3b82f6` (blue) · **Plan:** Free
- **Content kind:** text → **`ContentType.TEXT`**
- **Purpose:** Reusable code snippets, hooks, and patterns (e.g. `useDebounce`,
  a `cn()` class-merge util, a multi-stage Dockerfile).
- **Key fields used:** `title`, `content` (the code body), `language` (for syntax
  highlighting, e.g. `ts`, `tsx`, `dockerfile`), `description` (optional).

### 🟣 prompt

- **Icon:** `Sparkles` · **Color:** `#8b5cf6` (violet) · **Plan:** Free
- **Content kind:** text → **`ContentType.TEXT`**
- **Purpose:** AI prompts and system messages (e.g. a code-review prompt, a
  documentation-generation prompt).
- **Key fields used:** `title`, `content` (the prompt text), `description`
  (optional). No `language` in seed data.

### 🟠 command

- **Icon:** `Terminal` · **Color:** `#f97316` (orange) · **Plan:** Free
- **Content kind:** text → **`ContentType.TEXT`**
- **Purpose:** Shell/terminal commands (e.g. `git reset --soft HEAD~1`,
  `docker container prune -f`).
- **Key fields used:** `title`, `content` (the command), `language` (typically
  `bash`), `description` (optional).

### 🟡 note

- **Icon:** `StickyNote` · **Color:** `#fde047` (yellow) · **Plan:** Free
- **Content kind:** text → **`ContentType.TEXT`**
- **Purpose:** Free-form notes and explanations (Markdown editor).
- **Key fields used:** `title`, `content` (the note body), `description`
  (optional). No `language`. _(No `note` items in the current seed data.)_

### 🟢 link

- **Icon:** `Link` · **Color:** `#10b981` (green) · **Plan:** Free
- **Content kind:** url → **`ContentType.URL`**
- **Purpose:** Bookmarked URLs / reference links (e.g. Docker docs, Tailwind
  docs, Lucide Icons).
- **Key fields used:** `title`, **`url`** (the link target), `description`
  (optional). `content` is `null`.

### ⚪ file

- **Icon:** `File` · **Color:** `#6b7280` (gray) · **Plan:** **Pro**
- **Content kind:** file → **`ContentType.FILE`**
- **Purpose:** Arbitrary uploaded files (context files, docs, templates), stored
  in Cloudflare R2 via presigned upload.
- **Key fields used:** `title`, **`fileUrl`** (R2 URL), **`fileName`**,
  **`fileSize`** (bytes), `description` (optional). `content` / `url` are `null`.
  _(No `file` items in the current seed data — Pro path.)_

### 🩷 image

- **Icon:** `Image` · **Color:** `#ec4899` (pink) · **Plan:** **Pro**
- **Content kind:** file → **`ContentType.FILE`**
- **Purpose:** Uploaded images, stored in Cloudflare R2 like `file`.
- **Key fields used:** same as `file` — `title`, `fileUrl`, `fileName`,
  `fileSize`, `description`. _(No `image` items in the current seed data — Pro
  path.)_

---

## Content-Kind Classification: text vs. url vs. file

Every item resolves to **one of three content kinds**, captured by the
`ContentType` enum on `Item`. This enum is independent of the user-facing item
type — it tells the code **which field holds the payload**, so rendering and
validation can resolve content with a single `switch` on `contentType`.

The mapping is set at creation by `contentTypeFor(typeName)` in
[prisma/seed.ts](../prisma/seed.ts):

```ts
function contentTypeFor(typeName: string): ContentType {
  if (typeName === "link") return "URL";
  if (typeName === "file" || typeName === "image") return "FILE";
  return "TEXT";
}
```

| Content kind | `ContentType` | Types                             | Payload field(s)                    |
| ------------ | ------------- | --------------------------------- | ----------------------------------- |
| **text**     | `TEXT`        | snippet, prompt, command, note    | `content` (+ optional `language`)   |
| **url**      | `URL`         | link                              | `url`                               |
| **file**     | `FILE`        | file, image                       | `fileUrl`, `fileName`, `fileSize`   |

Why a dedicated `URL` value instead of overloading `TEXT`: it lets rendering /
validation resolve the payload with one `switch`, and gives future custom types
a clean storage shape to map onto.

---

## Shared Properties

All items — regardless of type — share this common shape on the `Item` model:

| Field         | Type          | Notes                                              |
| ------------- | ------------- | -------------------------------------------------- |
| `id`          | `String`      | `cuid()` primary key                               |
| `title`       | `String`      | required, always present                           |
| `description` | `String?`     | optional, all types                                |
| `contentType` | `ContentType` | `TEXT` \| `FILE` \| `URL`, default `TEXT`          |
| `isFavorite`  | `Boolean`     | default `false`                                    |
| `isPinned`    | `Boolean`     | default `false`                                    |
| `userId`      | `String`      | owner (FK → `User`, `onDelete: Cascade`)           |
| `itemTypeId`  | `String`      | FK → `ItemType` (resolves icon/color/name)         |
| `tags`        | `Tag[]`       | implicit many-to-many, per-user scoped             |
| `collections` | `ItemCollection[]` | many-to-many join, any type in any collection |
| `createdAt`   | `DateTime`    | default `now()`                                    |
| `updatedAt`   | `DateTime`    | `@updatedAt`                                       |

**Payload fields** (populated per content kind, `null` otherwise): `content`,
`language`, `url`, `fileUrl`, `fileName`, `fileSize`.

**Type metadata** lives on the related `ItemType` (not `Item`): `name`, `icon`
(lucide name), `color` (hex), `isSystem`. System types have `userId = null` and
are shared across all users; `@@unique([name, userId])` keeps names unique per
scope.

---

## Display Differences

The type's **color** and **icon** drive visual coding throughout the UI:

- **Item cards:** left **border** color = type color; the type icon + uppercased
  name render as a colored label chip.
- **Collection cards:** background/accent color reflects the type the collection
  holds most of.

Per-type **preview** rendering is handled by `ItemPreview` in
[ItemCard.tsx](../src/components/dashboard/ItemCard.tsx), branching on
`contentType` (and `language`):

| Condition                        | Rendered preview                                          |
| -------------------------------- | -------------------------------------------------------- |
| `contentType === "FILE"`         | `fileName` · formatted `fileSize` (e.g. `logo.png · 42 KB`) |
| `contentType === "URL"`          | the `url`, truncated to one line                         |
| `TEXT` **with** `language`       | code block — `<pre>` monospace, `line-clamp-3`, muted bg |
| `TEXT` **without** `language`    | prose — muted paragraph, `line-clamp-3`, preserves lines |

So the four text types split at render time: languaged text (typically
`snippet` / `command`) shows a code block, while un-languaged text (typically
`note` / `prompt`) shows plain prose. Icon resolution goes through
`getTypeIcon(name)` in [icons.ts](../src/lib/icons.ts), which maps the stored
lucide icon name to a component and **falls back to `File`** for unknown names.
