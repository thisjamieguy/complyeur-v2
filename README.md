# ComplyEUR

Version: v2.0

B2B SaaS application helping UK and European companies track employee travel compliance with the EU's 90/180-day Schengen rule. Built as a clean rebuild on Supabase — no data migration from the previous Flask v1.

---

## What it does

ComplyEUR tracks how many days employees have spent in the Schengen Area across a rolling 180-day window. Any non-EU citizen staying in Schengen may remain for a maximum of 90 days in any rolling 180-day period. The platform calculates this per employee, surfaces compliance risk, sends alerts, and provides forecasting tools so companies avoid violations before they happen.

The EU Entry/Exit System (EES) went live in October 2025, introducing biometric border checks. ComplyEUR's tracking data is now more important than ever for demonstrating compliance history.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js (App Router) + React + TypeScript |
| **Database & Auth** | Supabase (PostgreSQL + Auth + RLS) — prod in London |
| **Styling** | Tailwind CSS + Shadcn/UI |
| **Forms** | React Hook Form + Zod |
| **Date Handling** | date-fns (mandatory for all compliance calculations) |
| **Email** | Resend |
| **Rate Limiting** | Upstash Redis |
| **Error Tracking** | Sentry |
| **Payments** | Stripe |
| **CAPTCHA** | Cloudflare Turnstile |
| **Cookie Consent** | CookieYes |
| **Analytics** | Google Analytics 4 (consent-gated) |
| **Testing** | Vitest + Playwright |
| **Hosting** | Vercel |

---

## Local Setup

### Prerequisites

- Node.js 20.9+
- pnpm (recommended)
- Supabase CLI (`npm install -g supabase`)
- A Supabase account (free tier is fine for development)
- A Resend account (for email — free tier covers dev)

### Steps

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd complyeur
pnpm install

# 2. Copy environment template and fill in your credentials
cp .env.example .env.local
# Edit .env.local — see "Environment Variables" below

# 3. Start local Supabase stack (requires Docker)
supabase start

# 4. Apply database migrations to local Supabase
supabase db reset

# 5. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Tip:** `supabase start` outputs local API URL and anon key — paste these into `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. Every variable in `.env.example` has an inline comment explaining where to get it and whether it is required.

**Never commit `.env.local` to version control.** It is gitignored.

Critical variables for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL      # From: Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY # From: Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY     # From: Supabase dashboard → Settings → API (server-side only)
STRIPE_SECRET_KEY             # From: Stripe dashboard → Developers → API keys
RESEND_API_KEY                # From: Resend dashboard → API Keys
UPSTASH_REDIS_REST_URL        # From: Upstash console
UPSTASH_REDIS_REST_TOKEN      # From: Upstash console
NEXT_PUBLIC_SENTRY_DSN        # From: Sentry project settings
CRON_SECRET                   # Generate: openssl rand -hex 32
```

For the full list with descriptions, see [.env.example](.env.example).

---

## Commands

```bash
# Development
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm start            # Start production server locally

# Type checking & linting
pnpm typecheck
pnpm lint

# Testing
pnpm test             # Run unit tests (Vitest)
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests
pnpm test:e2e         # Playwright end-to-end tests
pnpm test:coverage    # Coverage report
pnpm test:all         # Full regression

# Database
pnpm db:types         # Generate TypeScript types from Supabase schema

# Stripe
pnpm billing:prices:sync    # Sync Stripe prices
pnpm billing:prices:audit   # Audit Stripe price IDs
pnpm billing:webhook:check  # Verify webhook configuration
```

---

## Running Tests

Unit tests run with Vitest and do not require a database connection:

```bash
pnpm test:unit
```

End-to-end tests require a running dev server and real Supabase credentials in `.env.local`:

```bash
pnpm dev          # In one terminal
pnpm test:e2e     # In another terminal
```

See `__tests__/` for unit tests and `e2e/` for Playwright tests.

---

## Deployment

The application deploys to Vercel automatically on push to `main`. The production Supabase project is in London. Preview deployments use the dev Supabase project in Frankfurt.

For full deployment steps, environment variable checklist, and go-live procedure, see:

- [docs/RUNBOOK.md](docs/RUNBOOK.md) — deployment, rollback, migration commands
- [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — environment separation, Supabase project refs
- [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md) — pre-launch sign-off checklist

---

## Architecture

The compliance engine is deterministic: no AI or approximation is used in the 90/180-day calculations. See:

- [memory/ARCHITECTURE.md](memory/ARCHITECTURE.md) — system design, auth flow, multi-tenancy model, data flow
- [memory/CONVENTIONS.md](memory/CONVENTIONS.md) — code conventions, file naming, Server Action patterns
- [docs/CALCULATION_LOGIC.md](docs/CALCULATION_LOGIC.md) — rolling window algorithm, Schengen membership, worked examples

Multi-tenancy is enforced via Supabase Row Level Security on every table. Company-level data isolation is the default state of every query, not an optional add-on.

---

## Legal

- [Privacy Policy](https://complyeur.com/privacy)
- [Terms of Service](https://complyeur.com/terms)
- [Cookie Policy](https://complyeur.com/cookies)
- [Accessibility Statement](https://complyeur.com/accessibility)

---

## License

Proprietary — All rights reserved.
