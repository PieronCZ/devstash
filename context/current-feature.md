# Current Feature

**Scan Quick Wins** — Low/no-risk cleanups surfaced by the `code-scanner` subagent. Skips the higher-effort structural items (`AppSidebar` split, `getRecentCollections` rework) for a dedicated follow-up.

## Status

In Progress

## Goals

1. **Composite indexes for common filter+sort patterns** (DB change — Prisma conventions only)
   - Add `@@index([userId, isPinned, updatedAt])` on `Item` and `@@index([userId, updatedAt])` on `Collection` in `prisma/schema.prisma`.
   - Additive, index-only change — no data/column changes, safe to apply.
   - **Must** go through a Prisma migration (`npm run db:migrate` → `prisma migrate dev`), never `db push` or raw SQL, so dev and production branches stay in sync. Deploy to prod with `npm run db:deploy` (`prisma migrate deploy`).

2. **Consolidate duplicated type metadata into a single source of truth**
   - Create `src/lib/item-types.ts` exporting the canonical system-type order and the Pro-gated type set.
   - Replace `SYSTEM_TYPE_ORDER` in `src/lib/db/items.ts` and `PRO_TYPES` in `src/components/dashboard/AppSidebar.tsx` with imports from it.
   - Pure refactor, no behavior change.

3. **Remove redundant `force-dynamic`**
   - Drop `export const dynamic = "force-dynamic"` in `src/app/dashboard/page.tsx` — the layout's `cookies()` call already makes the route dynamic, so it's a no-op.

4. **Add Next.js `loading` + `error` UI for the dashboard**
   - `src/app/dashboard/loading.tsx` — skeleton mirroring the page layout (header, 4 stats, collections grid, recent items grid) shown while the server component awaits its DB reads.
   - `src/app/dashboard/error.tsx` — route-level error boundary (`"use client"`) with a `reset()` retry button for failed DB reads/renders.

## Notes

- All three are low-risk; verify with `npm run build` (stop `npm run dev` first) and a quick `npm run lint`.
- After the migration, run `npx prisma migrate status` to confirm dev is in sync before committing.
- Deferred (not part of this feature): splitting `AppSidebar` into subcomponents, and bounding/`groupBy`-ing `getRecentCollections`.

## History

<!-- Keep this updated. Earliest to latest. -->

**Initial Setup** - Initial commit from Create Next App
**Cleanup boilerplate**
**Context init files**
**Dashboard UI Phase 1** - shadcn/ui init + button/input, dark mode by default, `/dashboard` route with full-height sidebar, top bar (search + New item/New collection, display only), and Sidebar/Main placeholders
**Dashboard UI Phase 2** - Collapsible icon-rail sidebar (shadcn Sidebar + Sheet mobile drawer): primary nav, item types linking to `/items/[type]` with counts and PRO badges, expandable Collections group with Favorites + Recent subsections, user avatar footer with Upgrade to Pro card, drawer toggle in header and top bar. Uppercase section labels, gray counts, light-gray text/icons. Fixed circular `--font-sans` reference so Geist actually applies.
**Dashboard UI Phase 3** - Main content area from mock data: 4 stats cards (items, collections, favorite items, favorite collections), recent collections grid (type-color accent, favorite star, type-icon chips, item count + relative time), pinned items, and 10 recent items. Added CollectionCard/ItemCard/StatCard components and relativeTime/formatFileSize helpers; ItemCard renders per-type previews (code block, prose, URL, file name · size). Consolidated the sidebar toggle to a single always-visible top-bar trigger, aligned the sidebar header height to the top bar, and added a pointer cursor on the toggle.
**Prisma + Neon PostgreSQL Setup** - Prisma 7 (new `prisma-client` generator + required output path, `@prisma/adapter-pg` driver adapter, `prisma.config.ts` config with dotenv) against Neon Postgres. Initial schema: User/Item/ItemType/Collection/ItemCollection (join)/Tag + NextAuth models (Account/Session/VerificationToken) and `ContentType` enum, with `@@index` on FKs, `onDelete: Cascade` on user-owned relations, scoped `@@unique([name, userId])`, and `cuid()` IDs. Added initial migration (`init`), idempotent seed of the 7 system item types, a singleton client (`src/lib/prisma.ts`), and a `scripts/test-db.ts` smoke test (connection, seed check, create→cascade-delete round-trip). New scripts: `postinstall` (generate), `db:migrate`, `db:deploy`, `db:seed`, `db:studio`, `db:test`.
**Seed Sample Data** - Added `passwordHash String?` to `User` (migration `add_user_password_hash`) + `bcryptjs`. Rewrote `prisma/seed.ts` to reset demo data and reseed idempotently: demo user (`demo@devstash.io`, `isPro:false`, `emailVerified`, password `12345678` bcrypt-hashed 12 rounds), 7 lowercase system item types, and 5 collections (React Patterns, AI Workflows, DevOps, Terminal Commands, Design Resources) totalling 18 items with correct `contentType` (TEXT/URL), per-collection `defaultType`, and real link URLs. Reworked `scripts/test-db.ts` to fetch and display the seeded demo data (user + password check, collections, per-item previews) with sanity assertions.
**Dashboard Collections** - Replaced the dashboard's dummy recent-collections data with live DB reads via Prisma. New `src/lib/db/collections.ts#getRecentCollections()` fetches the demo user's collections (newest first), tallies item types per collection to derive the card's accent/top-border color from the most-used type, returns all distinct types (most-used first) with real item counts, and falls back to `defaultType` for empty collections. `CollectionCard` now consumes the `DashboardCollection` shape (accent from most-used type, icon chip per distinct type). `/dashboard` became an async server component (`export const dynamic = "force-dynamic"`) with the collections grid, Collections/Favorite-collections stats, and header count sourced from the DB; items (stats/pinned/recent) stay on mock data for now. Scoped to `demo@devstash.io` until auth lands.
**Dashboard Items** - Replaced the dashboard's dummy pinned/recent item data with live DB reads via Prisma, completing the dashboard's move off `src/lib/mock-data.ts`. New `src/lib/db/items.ts` exposes a `DashboardItem` shape (resolved `type` icon/color/name + tags) and three functions: `getPinnedItems()` and `getRecentItems(limit = 10)` (both newest-first, filtered by `isPinned`) and `getItemStats()` (parallel `count` queries for total + favorites). `ItemCard` now consumes `DashboardItem` and derives its icon/left-border/label from `item.type` instead of a mock lookup; per-type previews and tag chips unchanged. `/dashboard` fetches collections + item stats + pinned + recent in one `Promise.all`, with the header count, Items stat, and Favorite-items stat now DB-sourced; the Pinned section stays hidden when there are no pins. Scoped to `demo@devstash.io` until auth lands. (`mock-data.ts` remains only for the sidebar's item types/user.)
**Stats & Sidebar** - Moved the sidebar off mock data onto live DB reads, finishing the dashboard's migration off `src/lib/mock-data.ts` (only the footer user card remains on mock until auth lands). New `getSidebarItemTypes()` in `src/lib/db/items.ts` returns the system item types with per-user item counts (filtered `_count`), sorted into the canonical order (snippet, prompt, command, note, link, file, image); new `getSidebarCollections()` in `src/lib/db/collections.ts` returns `{ favorites, recent }`, each with the accent color from its most-used item type (falling back to `defaultType`). `AppSidebar` now takes `itemTypes` + `collections` as props (fetched in `dashboard/layout.tsx` via `Promise.all`): types link to `/items/[name]` with live counts (PRO badge dropped — no such field in the DB), favorites render a star, recents render a colored circle keyed to the accent color, and the "View all collections" link points at `/collections`. Also seeded three favorite collections (React Patterns, AI Workflows, Design Resources) via a new optional `favorite` flag on the seed shape wired to `isFavorite`.
**Add Pro Badge to Sidebar** - Reintroduced the PRO badge (dropped during the DB migration) on the `file` and `image` item types in the sidebar. Added the shadcn `Badge` component (`base-nova` style) and a `PRO_TYPES` set in `AppSidebar`; PRO-gated rows render a clean, subtle, uppercase badge with a violet→reddish gradient (`#8b5cf6` → `#ec4899`, reused from the `prompt`/`image` type colors) at the end of the row before the count. Uses the `outline` variant (no bg-color under the gradient), `border-0`/`text-white`, and hides on the collapsed icon rail. Static badge (no DB `isPro` field); build passes.
