# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server at http://localhost:3000
npm run build     # Production build
npm run lint      # Run ESLint
```

No test suite is configured yet.

## Architecture

ComplyHub is a UK compliance SaaS platform built on:

- **Next.js 16 (App Router)** — frontend and API routes
- **Supabase** — PostgreSQL database + authentication (not yet installed)
- **OpenAI API** — AI policy generation (not yet installed)
- **Stripe** — subscription billing (not yet installed)
- **Tailwind CSS v4** — styling
- **Companies House API** — external data source for UK company lookup

### Intended project structure (from `docs/agent-instructions.md`)

```
app/          # Next.js App Router pages and API routes (API routes go in app/api/)
components/   # Reusable UI components
lib/          # All business logic (compliance scoring, Companies House client, etc.)
database/     # Supabase schema/migrations
docs/         # Source-of-truth documentation — do not modify these files
```

### Database tables (from `docs/database-schema.md`)

| Table | Key fields |
|---|---|
| `users` | id, email, plan_type |
| `companies` | id, user_id, company_number, industry, employee_count |
| `compliance_scores` | id, company_id, score, created_at |
| `alerts` | id, company_id, type, description, severity, due_date |
| `policies` | id, company_id, policy_type, content, created_at |

### MVP build phases (from `docs/roadmap.md`)

1. Landing page → auth → company lookup
2. Compliance score system → alerts dashboard
3. AI policy generator → policy storage
4. Stripe subscriptions

> Phase 1 (landing page, auth, company lookup) is complete. `proxy.ts` is the Next.js 16 equivalent of `middleware.ts` — it guards `/dashboard/*` routes.

## Development rules (from `docs/agent-instructions.md`)

- Always read `/docs` before implementing a feature, explain the plan, then generate code.
- Business logic lives in `/lib` — keep it out of components and route handlers.
- Components must be reusable.
- Validate all inputs; store all secrets in environment variables.
- Focus only on MVP features defined in `docs/roadmap.md`.
