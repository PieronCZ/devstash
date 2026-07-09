# Current Feature

<!-- Feature name and short description -->

## Status

<!-- Not Started | In Progress | Completed -->

## Goals

<!-- Goals and requirements -->

## Notes

<!-- Any extra notes -->

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
