# Current Feature

Dashboard UI Phase 3 — build out the main content area (final phase of the 3-phase dashboard UI layout).

## Status

In Progress

## Goals

Build the main content area to the right of the sidebar, using mock data (`@src/lib/mock-data.js`) imported directly until the database is implemented. Match the reference screenshot (`@context/screenshots/dashboard-ui-main.png`).

- 4 stats cards at the top: number of items, collections, favorite items, and favorite collections (not shown in screenshot)
- Recent collections
- Pinned items
- 10 recent items

## Notes

- Import mock data directly for now; database comes later.
- References: `@context/screenshots/dashboard-ui-main.png`, `@context/project-overview.md`, `@src/lib/mock-data.js`, `@context/features/dashboard-phase-1-spec.md`, `@context/features/dashboard-phase-2-spec.md`

## History

<!-- Keep this updated. Earliest to latest. -->

**Initial Setup** - Initial commit from Create Next App
**Cleanup boilerplate**
**Context init files**
**Dashboard UI Phase 1** - shadcn/ui init + button/input, dark mode by default, `/dashboard` route with full-height sidebar, top bar (search + New item/New collection, display only), and Sidebar/Main placeholders
**Dashboard UI Phase 2** - Collapsible icon-rail sidebar (shadcn Sidebar + Sheet mobile drawer): primary nav, item types linking to `/items/[type]` with counts and PRO badges, expandable Collections group with Favorites + Recent subsections, user avatar footer with Upgrade to Pro card, drawer toggle in header and top bar. Uppercase section labels, gray counts, light-gray text/icons. Fixed circular `--font-sans` reference so Geist actually applies.
