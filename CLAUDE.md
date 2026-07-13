# CLAUDE.md

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Tech Stack

- Next.js 16 (App Router, Server Components)
- TypeScript (strict)
- Prisma + Neon PostgreSQL
- NextAuth v5 (Email + GitHub)
- Tailwind CSS v4 + shadcn/ui
- Cloudflare R2 (file storage)
- OpenAI gpt-5-nano
- Stripe (payments)

## Commands

```bash
npm run dev            # start dev server (http://localhost:3000)
npm run build          # production build
npm run start          # serve the production build
npm run lint           # ESLint (flat config)
npm test               # Vitest — unit tests (server actions + utilities only)
npm run test:watch     # Vitest in watch mode
npm run test:coverage  # Vitest with coverage report
```

## Testing

Vitest, Node environment, scoped to **business logic only** — server actions
(`src/actions/**`) and utilities (`src/lib/**`). **No component/UI tests.**
Tests are co-located as `*.test.ts`; import `describe/it/expect` from `vitest`.
Mock external boundaries (Prisma, Resend, Upstash) rather than hitting them.
See `context/ai-interaction.md` → Testing.

## Neon Database (MCP)

When using the Neon MCP for this project, ALWAYS use these fixed targets — never
call `list_projects` / `describe_project` to "discover" them, and never guess:

- **Project:** `devstash` — projectId `young-surf-35161033`
- **Default branch to use:** `development` — branchId `br-frosty-fire-asb0z4k7`

Rules:

1. Every Neon MCP call (run_sql, get_database_tables, migrations, etc.) MUST pass
   `projectId: young-surf-35161033` and `branchId: br-frosty-fire-asb0z4k7`.
2. NEVER touch the `production` branch (`br-sparkling-field-asd9o4dn`) — no reads,
   no writes, no migrations — unless I explicitly name "production" in my request.
3. If a request is ambiguous about which branch, assume `development`.
4. Never run destructive SQL (DROP, DELETE, TRUNCATE, UPDATE/INSERT without my
   go-ahead) on any branch without asking first.

**IMPORTANT:** Do not add Claude to any commit messages
