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
