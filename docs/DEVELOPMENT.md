# ComplyEur Local Development Guide

Operational reference for setting up, running, and testing ComplyEur locally.
This content was extracted from `CLAUDE.md` to keep the agent context file lean;
`CLAUDE.md` links here for full detail.

- Environment policy is owned by `docs/architecture/ENVIRONMENTS.md`.
- Concrete project references and migration push commands live in `docs/ENVIRONMENTS.md`.
- If this file conflicts with either of those on policy, those documents win.

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

The `npm run db:types` script in `package.json` is currently pinned to the
**legacy/inactive** project ref (`sheqtawytsidyhzpzefk` — see
[Legacy/Inactive Projects](./ENVIRONMENTS.md#legacyinactive-projects)
below). Running it as-is regenerates `types/database.ts` from the wrong
schema. Until that script is updated, generate types explicitly against the
active project you're targeting instead:
```bash
npx supabase gen types typescript --project-id ympwgavzlvyklkucskcj > types/database.ts   # Test/Preview
npx supabase gen types typescript --project-id bewydxxynjtfpytunlcq > types/database.ts   # Production
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
