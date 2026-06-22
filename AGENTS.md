# ComplyEur Agent Instructions

Last reviewed: 2026-05-28

## Project Overview

ComplyEur is a B2B SaaS application for tracking employee travel compliance
with the Schengen 90/180-day rule. The target customer is UK and European
businesses managing post-Brexit travel risk.

- Product version: v2.0 Supabase rebuild
- App root: `complyeur/`
- Primary package manager: `pnpm`
- Deployment: Vercel
- Database/auth: Supabase with mandatory RLS

## Current Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4 and shadcn/ui style primitives
- Supabase PostgreSQL, Auth, RLS, and Edge Functions
- Stripe billing
- Resend email
- Upstash Redis rate limiting
- Sentry monitoring
- CookieYes and consent-gated Google Analytics 4
- Vitest for unit/integration tests
- Playwright for end-to-end tests

## Source Of Truth Hierarchy

When context conflicts, use this order:

1. **Repository code, migrations, and config** (`app/`, `lib/`, `supabase/migrations/`, `package.json`, `next.config.ts`, `vercel.json`)
2. **Automated tests and evidence** (`__tests__/`, `e2e/`, `docs/compliance/soc2/evidence/`)
3. **Current engineering docs** (`docs/architecture/`, `docs/security/`, `docs/engineering/`, `docs/operations/`)
4. **Historical memory and AI context** (`memory/`, older audits, `docs/internal/ai-context-notes.md`)

Historical AI exports and memory files are not authoritative. Treat them as prompts for verification, not as proof. If they disagree with the current repo, follow the repo and update or flag the stale document.

## First Files To Read

For most engineering tasks, read only the relevant subset:

- General orientation: this file, `docs/README.md`, `docs/engineering/README.md`
- Architecture or environment work: `docs/architecture/README.md`, `docs/architecture/ENVIRONMENTS.md`, `docs/architecture/MIGRATION_WORKFLOW.md`
- Security or auth work: `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`, `docs/engineering/security-decisions.md`, `docs/engineering/adr/ADR-001-multi-tenant-rls-strategy.md`
- Compliance algorithm work: `docs/CALCULATION_LOGIC.md`, `docs/engineering/algorithm-decisions.md`, `docs/engineering/adr/ADR-002-compliance-engine-boundaries.md`, `lib/compliance/`
- Audit log work: `docs/engineering/adr/ADR-003-audit-log-immutability.md`, `lib/gdpr/audit.ts`, relevant migrations
- Standards and governance: `docs/standards/coding-standards.md`, `docs/standards/security-standards.md`, `docs/standards/testing-standards.md`, `docs/standards/ai-agent-rules.md`

## Historical Context Rules

- Do not import raw Claude exports, chat transcripts, or AI-generated research into the repo.
- Do not commit personal data, customer data, tokens, `.env*` files, debug logs, or export archives.
- Do not assume old audit findings are still true. Verify against current source and tests.
- Do not use product, launch, UX, tax, legal, or market-research notes as implementation facts without current review.

## Critical Domain Rules

### Date Handling

Do not use native JavaScript `Date` parsing for 90/180 compliance calculations.
Timezone shifts can move an ISO calendar day into the wrong local day.

Use date-fns and ISO date strings for compliance logic:

```ts
import { differenceInDays, parseISO } from 'date-fns'

const tripStart = parseISO('2026-05-28')
```

Avoid this in compliance calculations:

```ts
const tripStart = new Date('2026-05-28')
```

### Schengen Rules

- Non-EU citizens can stay a maximum of 90 days in any rolling 180-day window.
- Each travel day counts if it falls in the Schengen Area.
- Ireland and Cyprus are EU members but not Schengen members. Do not count them.
- Keep country logic centralized in `lib/constants/schengen-countries.ts` and
  related compliance modules.

### Multi-Tenancy and RLS

- Every Supabase table must have Row Level Security enabled.
- Tenant isolation is a hard security boundary, not a UI filter.
- Prefer policies that use cached helper functions such as
  `(SELECT get_current_user_company_id())`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.
- Use generated database types from `types/database.ts`.

## Engineering Standards

- Keep changes small and directly tied to the request.
- Do not add broad refactors around a narrow fix.
- Use functional React components.
- Prefer Server Components unless client-side state, effects, or browser APIs
  are required.
- Put shared client behavior in hooks.
- Define interfaces for props, API responses, and database shapes.
- Avoid `any`; if it is unavoidable, keep it local and explain why.
- Use Zod schemas for request, form, and import validation.
- Handle async errors with user-safe messages.
- Do not log sensitive data in production paths.

## UI Standards

- Use the established app visual language, not a new marketing style.
- Use the 8px spacing system for margins, padding, and gaps.
- Use `rounded-xl` as the default radius for app surfaces.
- Use restrained colors, `shadow-sm`, and subtle hover states.
- Avoid decorative gradients, radial glows, oversized hero banners, and
  arbitrary Tailwind values unless there is a specific design requirement.
- Every async interaction needs loading, error, and empty states as applicable.
- Links and buttons must either work or be visibly disabled.
- Use specific product copy. Do not add placeholder testimonials or filler text.

## File Map

```text
app/                  Next.js App Router routes and Server Actions
app/(auth)/           Login, signup, password reset
app/(dashboard)/      Authenticated product pages
app/(public)/         Public marketing and legal pages
app/admin/            Admin surfaces
app/api/              Route handlers
components/           Feature components and UI primitives
components/ui/        Shared primitives; change carefully
hooks/                Reusable React hooks
contexts/             React providers
lib/compliance/       90/180-day calculation engine
lib/constants/        Country lists, limits, and app constants
lib/db/               Supabase query layer
lib/security/         Tenant isolation, auth, CSP, MFA, cron auth
lib/billing/          Stripe integration
lib/gdpr/             DSAR, retention, export, anonymization
lib/import/           CSV/Excel/Gantt import parsing and validation
types/                Shared TypeScript and generated DB types
__tests__/            Unit and integration tests
e2e/                  Playwright tests
supabase/migrations/  Database schema changes
docs/                 App docs, runbooks, audits, and plans
memory/               Architecture and long-lived project context
```

## Commands

Run these from `complyeur/`.

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:e2e:baseline
pnpm test:e2e:import
pnpm test:e2e:dashboard
pnpm test:e2e:multi-user
pnpm test:e2e:a11y
pnpm test:e2e:mobile
pnpm test:coverage
pnpm build
pnpm security:check
pnpm db:types
```

## Database Workflow

- Create schema changes as Supabase migrations.
- Test migrations locally with `supabase db reset` when relevant.
- Dry-run remote migration pushes before applying them.
- Apply migrations to staging before production.
- Do not manually patch production schema through the Supabase SQL editor.
- Regenerate `types/database.ts` after schema changes.

## Verification Policy

Use the smallest verification that proves the change:

- Compliance logic: `pnpm test:compliance`, then broader tests if shared code changed.
- React/UI changes: `pnpm lint`, targeted Vitest tests, and browser/Playwright checks.
- Database changes: local reset or targeted SQL verification, plus type generation.
- Security or tenant isolation changes: targeted security tests and regression tests.
- Before shipping: `pnpm typecheck`, `pnpm lint`, relevant tests, and `pnpm build`.

## Git Workflow Decisions

- Commit when a change is logically complete or a useful local checkpoint, such
  as a finished bug fix, passing targeted test, focused refactor, or docs update.
- Push when a committed branch should be backed up, made visible on GitHub, or
  run through CI/preview deployment checks.
- Open a draft PR when work is useful to share but not ready to merge, such as
  incomplete work, risky changes needing feedback, or changes that need preview
  validation before final polish.
- Open a ready PR when the change is complete, scoped, tested, and mergeable
  with no known blockers, unresolved migrations, or missing environment updates.
- When starting work that is completely unrelated to the current branch, create
  or switch to a new focused branch before editing, using the `codex/` prefix by
  default. Keep unrelated work out of the active branch.
- If the current branch has uncommitted changes, do not stash, commit, move, or
  mix them into a new branch without explicit user direction; pause and ask how
  to separate the work.
- Typical flow: small finished fix -> commit -> push -> ready PR; incomplete or
  risky work -> commit -> push -> draft PR; local experiment -> no PR yet.
- Continue to commit, push, or open PRs only when explicitly asked.

## Working Style

- Prefer clear diagnosis before edits.
- Preserve existing user changes in the working tree.
- Avoid generated/cache directories.
- Stop and reassess if a small fix starts causing unrelated failures.
- Commit only when explicitly asked.
