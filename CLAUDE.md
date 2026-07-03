# CLAUDE.md

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:
- @contex/project-overview.md
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
npm run dev     # start dev server (http://localhost:3000)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint (flat config)
```

**IMPORTANT:** Do not add Claude to any commit messages