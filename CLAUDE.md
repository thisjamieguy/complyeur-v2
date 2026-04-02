# CLAUDE.md — ComplyEur Development Context

## Project Overview
**ComplyEur** is a B2B SaaS application helping companies track employee travel compliance with the EU's 90/180-day Schengen visa rule. Target market: UK businesses with employees traveling to the EU post-Brexit.

- **Current Version:** v2.0 (Supabase rebuild)
- **Developer:** Solo founder, AI-assisted development workflow

---

## Environment Setup

**Required for local development:**

Create `.env.local` in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

**Get Supabase keys:**
- Dashboard → Settings → API
- Use Project URL and anon key for frontend
- Service role key for server-side only (NEVER in frontend)

**Environment files in this project:**
- `.env.local` — Local development (gitignored)
- `.env.example` — Template with variable names

---

## Supabase Local Development

**Start local Supabase stack:**
```bash
supabase start        # Starts Docker containers (Postgres, Auth, Storage, etc.)
supabase status       # Show running services and URLs
supabase stop         # Stop all services
supabase db reset     # Reset local database to migrations
```

**Local Supabase URLs** (after `supabase start`):
- API: `http://localhost:54321`
- Database: `postgresql://postgres:postgres@localhost:54322/postgres`
- Studio: `http://localhost:54323`

**Generate types after schema changes:**
```bash
npm run db:types      # Uses project ID from package.json script
```

---

## Database Deployment Workflow

**Three-stage pipeline: Local → Staging → Production**

| Stage | Purpose | Database |
|-------|---------|----------|
| **Local** | Build & iterate (`supabase start`) | Docker (localhost:54322) |
| **Staging** | Test with real Supabase infra | `complyeur-staging` (Frankfurt) |
| **Production** | Live users | `complyeur-prod` (London) |

### Supabase Project References

| Environment | Project Ref | Region |
|-------------|-------------|--------|
| Production | `bewydxxynjtfpytunlcq` | West Europe (London) |
| Staging | `erojhukkihzxksbnjoix` | Central EU (Frankfurt) |
| Dev | `ympwgavzlvyklkucskcj` | Central EU (Frankfurt) |

### Pushing Migrations

**Important: Always use port 5432 (session mode pooler).** Port 6543 (transaction mode) does not work for migrations.

**Important: Always pass the password via `SUPABASE_DB_PASSWORD` env var.** Piping to `supabase link` does not reliably store it. Use the format: `SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push ...`

```bash
# 1. Create migration locally
supabase migration new my_change_name

# 2. Test locally (replays all migrations from scratch)
supabase db reset

# 3. Dry run against staging (check what will be applied)
SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push --dry-run --db-url "postgresql://postgres.erojhukkihzxksbnjoix:<PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# 4. Push to staging
SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push --db-url "postgresql://postgres.erojhukkihzxksbnjoix:<PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# 5. Test on staging — only when happy, push to production
SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push --db-url "postgresql://postgres.bewydxxynjtfpytunlcq:<PASSWORD>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
```

### Rules
- **Never skip staging** — always test migrations there before production
- **Never manually edit remote schemas** via the SQL Editor for structural changes — use migrations
- **Always dry-run first** (`--dry-run`) before pushing to any remote environment
- **Seed data is local only** — `supabase/seed.sql` runs on `db reset` but NOT on `db push`
- **Database passwords** are in the Supabase dashboard (Settings → Database) — never commit them

---

## Tech Stack
- **Frontend:** Next.js (App Router) + React + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

---

## How to Help Me
- Plain English first, technical explanation second
- Structured, step-by-step guidance (phases, checklists, tables)
- Break big changes into small, incremental steps — never skip steps
- Always provide copy-ready code blocks
- When debugging: give diagnostic paths, not guesses

---

## Critical Lessons Learned

### ⚠️ Date Handling (HIGH PRIORITY)
**Do NOT use native JavaScript `Date` objects for 90/180 calculations.**

Native JS dates have timezone issues — a trip on "Oct 12" can shift days based on browser timezone.

**Always use:**
```typescript
import { parseISO, differenceInDays } from 'date-fns'

// Good - treats as local date, no timezone shift
const tripStart = parseISO('2025-10-12')

// Bad - timezone issues
const tripStart = new Date('2025-10-12') // DON'T DO THIS
```

### ⚠️ The "Fix One, Break Two" Pattern
We've hit cascading bugs repeatedly. To prevent this:
1. Make atomic, single-purpose changes
2. Test adjacent features after every change
3. Git commit after each working change
4. If something breaks unexpectedly, STOP and audit before fixing more

### ⚠️ TypeScript is Non-Negotiable
TypeScript significantly improves AI tool accuracy (Cursor, Claude Code).
- All new files must be `.ts` or `.tsx`
- Define interfaces for all props, API responses, database types
- Use Supabase generated types: `npx supabase gen types typescript`

---

## UI/UX Standards (Non-Negotiable)

### Spacing & Layout
- **8px spacing system** for all margins, padding, gaps
- Mobile-first, responsive design
- Clean grid alignment — no misaligned cards

### Visual Consistency
- **One heading font + one body font** (consistent weights/line-heights)
- **12px border radius everywhere** — no mixing
- Small, intentional color palette (no random purple gradients)
- Subtle hover effects only (no aggressive lifting/scaling)

### Functional Requirements
- **Loading states for ALL async actions**
- **No placeholder "#" links** — every button/link must work or be visibly disabled
- **Specific copy** — no generic "Build your dreams" filler
- Error states and empty states for all data displays

### Red Flags to Actively Avoid
- Sparkle emojis as UI elements
- Fake testimonials or placeholder content
- Inconsistent spacing or border radiuses
- Broken mobile responsiveness
- Non-functional interactive elements

---

## Supabase Specifics

### Row Level Security (MANDATORY)
**Every table must have RLS enabled.** No exceptions. An `rls_auto_enable()` event trigger enforces this on new tables.
```sql
-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Example policy: users see only their company's data
-- Uses get_current_user_company_id() for performance (cached per-statement)
CREATE POLICY "Users see own employees"
  ON employees FOR SELECT
  USING (company_id = (SELECT get_current_user_company_id()));
```

### Keys & Security
- **anon key:** Safe to use in frontend
- **service_role key:** NEVER expose in frontend — server/Edge Functions only
- Generate types after schema changes: `npx supabase gen types typescript --project-id YOUR_ID > types/database.ts`

### Auth Patterns
- Use Supabase Auth for all authentication
- Check session on protected routes: `const { data: { user } } = await supabase.auth.getUser()`
- Handle OAuth redirects properly (set Site URL in Supabase dashboard)

---

## Code Standards

### TypeScript
- Strict mode enabled
- Explicit types — no `any` unless absolutely necessary
- Interface over type for object shapes
- Use Supabase generated types

### React/Next.js
- Functional components only
- Custom hooks for shared logic
- Server components where possible (App Router)
- Client components only when needed (`'use client'`)

### Error Handling
- Try/catch on all async operations
- User-friendly error messages (not raw errors)
- Console logging for debugging (remove before production)
- Toast notifications for user feedback

### Git Discipline
- Meaningful commit messages
- One feature per branch
- No direct commits to main
- Delete branches after merge (we had 79+ abandoned branches)
- Commit after each working change

---

## Key Domain Concepts

### 90/180-Day Rule
- Non-EU citizens can stay max 90 days within any rolling 180-day period in Schengen Area
- Each day's compliance = count trips in previous 180 days
- "Days remaining" = 90 minus days used in rolling window
- Use ISO date strings (`'2025-10-12'`) for all calculations

### Schengen Membership — Critical Edge Cases
- **Ireland and Cyprus are EU members but NOT Schengen.** Trips there do not count toward the 90-day limit. This is a common mistake — do not add IE or CY to the Schengen country list.
- **Romania and Bulgaria became full Schengen members on 1 January 2025** (land border checks removed). Trips to RO or BG on or after this date count toward the limit. Both are already in `constants.ts` with `since: '2025-01-01'`.
- **Microstates count as Schengen:** Monaco (MC), Vatican City (VA), San Marino (SM), and Andorra (AD) have open borders with their Schengen neighbours. Days spent there count toward the 90-day limit. All four are in `SCHENGEN_COUNTRY_CODES`.

### EU Entry/Exit System (EES)
- The EU's Entry/Exit System went live in **October 2025**. It introduces biometric checks (fingerprints, facial image) at external Schengen borders for non-EU nationals.
- EES records every entry and exit electronically, replacing manual passport stamping.
- ComplyEUR is complementary to EES — it provides pre-trip forecasting and employer-side tracking. ComplyEUR does not connect to EES infrastructure.
- EES makes accurate trip recording more important: border agencies can now cross-check electronic records against declared travel history.

### Core Entities
- **Companies** — the paying customer (auth.uid() = company)
- **Employees** — people being tracked (belong to a company)
- **Trips** — date ranges of travel to Schengen
- **Compliance Status** — calculated field (compliant/warning/violation)

### Database Schema (Simplified)
```
companies (id, name, email, stripe_customer_id, created_at)
employees (id, company_id, name, nationality_type, created_at)
trips (id, employee_id, company_id, entry_date, exit_date, country, travel_days, created_at)
```

- `employees.nationality_type`: required — `'uk_citizen'`, `'eu_schengen_citizen'`, or `'rest_of_world'` (used for 90/180 exemptions)
- `trips.travel_days`: computed column (`exit_date - entry_date + 1`, PostgreSQL GENERATED ALWAYS AS STORED)
- `trips.country`: 2-character ISO code (CHECK constraint)

---

## Security Checklist

### Before Every Deploy
- [ ] No `service_role` key in frontend code
- [ ] RLS policies on all tables
- [ ] Environment variables not in Git
- [ ] TypeScript compiles without errors
- [ ] No `console.log` with sensitive data

### Content Security Policy
When adding new third-party services, update CSP headers:
```typescript
// vercel.json or middleware
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net *.supabase.co; connect-src 'self' *.supabase.co"
        }
      ]
    }
  ]
}
```

---

## File Structure
```
/app                 → Next.js App Router pages
  /(auth)            → Login, signup, password reset (public)
  /(dashboard)       → Protected app pages (requires auth)
    /dashboard       → Main compliance dashboard
    /employee        → Employee CRUD (singular, has [id]/ dynamic route)
    /import          → Excel/CSV bulk import
    /settings        → Company settings (import-history/, mappings/, team/)
    /calendar        → Calendar view of travel
    /exports         → Data export features
    /gdpr            → GDPR data management
    /trip-forecast   → Trip forecasting tools
    /future-job-alerts → Future compliance alert predictions
    /test-endpoints  → API endpoint testing (dev only)
    /actions.ts      → Shared server actions for dashboard
  /admin             → Admin panel (companies, tiers, activity, feedback, metrics, settings)
  /auth              → OAuth callback handler
  /mfa               → Multi-factor authentication flows
  /actions           → Top-level server actions
  /api               → API routes (health, billing, GDPR, cron, test-email)
/components          → Organized by FEATURE FOLDER
  /ui                → Shadcn/UI primitives (DO NOT edit directly)
  /dashboard         → Dashboard widgets and cards
  /employees         → Employee CRUD components
  /trips             → Trip CRUD components
  /import            → Import feature components
  /settings          → Settings page components
  /forms             → Form components
  /layout            → Layout components (header, sidebar)
  /navigation        → Nav components
  /admin, /alerts, /analytics, /auth, /calendar, /compliance,
  /exports, /feedback, /forecasting, /gdpr, /marketing,
  /mfa, /onboarding  → Feature components
/hooks               → Custom React hooks
/contexts            → React Context providers
/lib                 → Utilities and business logic
  /supabase          → Supabase clients (client.ts, server.ts, admin.ts)
  /db                → Database query layer (one file per entity)
  /data              → Cached server-side queries (React cache())
  /compliance        → 90/180-day calculation engine
  /validations       → Zod schemas (trip, employee, etc.)
  /errors            → Custom error classes (AuthError, ValidationError, etc.)
  /services          → Business logic services (alert detection, etc.)
  /security          → Security helpers (MFA enforcement, etc.)
  /billing           → Stripe billing integration
  /constants         → App-wide constants (schengen-countries, etc.)
  /import            → Import parsing, validation, insertion logic
  /gdpr              → GDPR compliance utilities
  /admin             → Admin utilities
  /analytics         → Analytics helpers
  /exports           → Export generation logic
  /performance       → Performance monitoring
  /permissions.ts    → Role-based permission system
  /rate-limit.ts     → Server action rate limiting
/types               → TypeScript interfaces and generated Supabase types
/__tests__           → Unit and integration tests
/e2e                 → Playwright end-to-end tests
/scripts             → Build and utility scripts
/supabase
  /migrations        → Database migrations
  config.toml        → Local Supabase configuration
/memory              → AI context files
```

---

## Quick Commands
```bash
# Development
npm run dev          # Start dev server (with Turbopack)
npm run build        # Production build
npm run start        # Start production server

# Testing
npm run test         # Run unit tests (vitest)
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests
npm run test:e2e     # Run all Playwright e2e tests
npm run test:coverage     # Run tests with coverage report
npm run test:all     # Full regression (coverage + e2e)
npm run stress-test  # Run load/stress tests (requires setup)

# Type checking & linting
npm run typecheck
npm run lint

# Database
npm run db:types     # Generate TypeScript types from Supabase schema

# Billing (Stripe)
npm run billing:prices:sync   # Sync Stripe prices
npm run billing:prices:audit  # Audit Stripe price IDs
npm run billing:webhook:check # Check webhook configuration

# Security
npm run security:check        # Run dependency audit
```

---

## Health Stack

Commands aligned with `/health` (gstack) and quick repo sanity. Run from the project root; this repo uses **pnpm**.

| Gate | Command | What it checks |
|------|---------|----------------|
| Typecheck | `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| Lint | `pnpm lint` | ESLint |
| Tests | `pnpm test` | Vitest (unit + integration in default config) |
| Dependency hygiene | `pnpm knip` | Unused / unlisted **dependencies** and CLI references (`knip --dependencies`) |
| Shell scripts | `pnpm shellcheck` | `scripts/*.sh`, `load-testing/run-load-test.sh`, `agent/scripts/*.sh` |

**Deeper dead-code pass (optional):** `pnpm knip:full` runs full Knip (unused files, exports, types). Noisy on large Next.js apps until `knip.json` is tuned further.

**Optional release gates (not in the default health composite):** `pnpm build` (production build), `pnpm run security:check` (`pnpm audit`).

---

## Testing Workflow

**When to run which tests:**

| Scenario | Command | Why |
|----------|---------|-----|
| Before every commit | `npm run test:unit` | Fast, catches logic errors |
| After UI changes | `npm run test:e2e` | Verifies user flows work |
| Before PR/merge | `npm run test:coverage` | Ensure adequate test coverage |
| Major feature work | `npm run test:all` | Full regression check |
| Performance changes | `npm run stress-test` | Load testing validation |

**Test structure:**
- `lib/compliance/__tests__/` — Unit tests for compliance calculations
- `__tests__/unit/` — Other unit tests
- `__tests__/integration/` — Integration tests
- `e2e/` — Playwright end-to-end tests

**E2E test patterns:**
- Tests run against local dev server (`npm run dev`)
- Use `npm run test:e2e` for all tests
- Use `npm run test:e2e:dashboard` for specific suites
- Playwright UI mode: add `--ui` flag for debugging

---

## Debugging Approach

When something breaks:
1. **STOP** — don't keep making changes
2. **Isolate** — identify exactly which file/function is failing
3. **Understand** — read the error message carefully
4. **Fix minimally** — smallest change that fixes the issue
5. **Test adjacent** — verify related features still work
6. **Commit** — save working state before moving on

If cascade breaks start happening → full audit before more fixes.

---

## Key Project Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Architecture overview | `memory/ARCHITECTURE.md` | System design, data flow, component structure |
| Code conventions | `memory/CONVENTIONS.md` | Naming, patterns, style rules |
| Performance audit | `memory/PERFORMANCE-AUDIT.md` | 60 performance issues with prioritised fix plan (audit date: 2026-02-18) |
| Security audit | `memory/SECURITY-AUDIT.md` | Application security findings and remediation |

To re-run the performance audit, prompt: `Run a full performance audit on the codebase after clearing chat`

---

## Notes
- I use OneNote for planning/documentation
- Incremental progress > big bang changes