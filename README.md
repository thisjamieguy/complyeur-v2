# ComplyEUR

**Version: v0.1.0**

B2B SaaS application helping UK companies track employee travel compliance with the EU's 90/180-day Schengen visa rule.

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Database & Auth** | Supabase (PostgreSQL + Auth + RLS) |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | Radix UI + shadcn/ui |
| **Forms** | React Hook Form + Zod |
| **Date Handling** | date-fns |
| **Email** | Resend |
| **Rate Limiting** | Upstash Redis |
| **Error Tracking** | Sentry |
| **Testing** | Vitest + Playwright |
| **Hosting** | Vercel |

## Features Built

### Core Functionality
- **90/180-Day Compliance Engine** — Rolling window calculations with risk assessment
- **Employee Management** — Add, edit, soft-delete employees with GDPR compliance
- **Trip Tracking** — Individual and bulk trip entry with overlap validation
- **Compliance Dashboard** — Status overview with filtering and sorting
- **Calendar View** — Gantt-style visualization of employee travel

### Planning & Forecasting
- **Trip Forecasting** — "What-if" calculator for proposed travel
- **Future Alerts** — Proactive warnings for upcoming compliance issues

### Data Management
- **CSV/Excel Import** — Column mapping, duplicate handling, validation
- **Export System** — CSV exports with date range filtering
- **GDPR Tools** — Anonymization, soft delete, DSAR exports, audit logging

### Admin Features
- **Multi-tenant Admin Panel** — Company management, activity logs
- **Subscription Tiers** — Tier management and entitlements
- **System Settings** — Global configuration

### Infrastructure
- **Authentication** — Email/password with OAuth support
- **Email Notifications** — Compliance alerts via Resend
- **Rate Limiting** — Distributed rate limiting via Upstash
- **Error Boundaries** — Graceful error handling throughout

## Setup

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- Resend account (for emails)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd complyeur
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase and Resend credentials

# Generate database types
pnpm db:types

# Start development server
pnpm dev
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### Commands

```bash
pnpm dev            # Start dev server (Turbopack)
pnpm build          # Production build
pnpm test           # Run unit tests
pnpm test:e2e       # Run Playwright tests
pnpm db:types       # Regenerate Supabase types
pnpm lint           # ESLint
```

## Architecture

See `docs/architecture/` for detailed documentation on:
- Environment separation (Production vs Test)
- Database migration workflow
- Production safety rails
- Test data policies

## License

Proprietary — All rights reserved.
