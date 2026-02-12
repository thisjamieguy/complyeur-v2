# ComplyEUR v2.0 — Architecture Context

> **Purpose:** Feed this file to AI coding assistants at the start of every session.
> It contains everything an AI needs to write correct code for ComplyEUR on the first try.

---

## What This App Does

B2B SaaS that tracks employee travel compliance with EU Schengen 90/180-day visa rules.
Target users: HR managers, compliance officers at UK/US companies with non-EU employees traveling to Europe.
Calculation errors carry **legal liability** (€5,000+ fines, entry bans). Accuracy is non-negotiable.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | Next.js 14 (App Router)             |
| Language     | TypeScript (strict mode)            |
| Database     | Supabase (PostgreSQL + Auth + RLS)  |
| Styling      | Tailwind CSS + Shadcn/UI            |
| Icons        | Lucide React (via Shadcn)           |
| Dates        | date-fns (NEVER native JS Date)     |
| Validation   | Zod                                 |
| Toasts       | Sonner                              |
| Hosting      | Vercel                              |
| File parsing | SheetJS (xlsx package)              |

---

## Folder Structure

```
app/
├── (auth)/              # Login, signup, password reset (public)
├── (dashboard)/         # Protected app pages (requires auth)
│   ├── dashboard/       # Main compliance dashboard
│   ├── employee/        # Employee CRUD (singular — has [id]/ dynamic route)
│   ├── import/          # Excel/CSV bulk import (upload/, preview/, success/)
│   ├── settings/        # Company settings (import-history/, mappings/, team/)
│   ├── calendar/        # Calendar view of travel
│   ├── exports/         # Data export features
│   ├── future-job-alerts/ # Upcoming compliance risk alerts
│   ├── gdpr/            # GDPR data management
│   ├── trip-forecast/   # Trip forecasting tools
│   ├── actions.ts       # Shared server actions for dashboard
│   └── layout.tsx       # Dashboard shell with nav
├── (public)/            # Public marketing pages (about, pricing, faq, etc.)
├── (preview)/           # Landing page variants (landing/, landing-v2/, etc.)
├── admin/               # Admin panel (companies, tiers, activity, settings)
├── auth/                # OAuth callback handler
├── mfa/                 # Multi-factor authentication flows
├── unsubscribe/         # Email unsubscribe handler
├── actions/             # Top-level server actions (exports, etc.)
├── api/                 # API routes (minimal — health, billing, GDPR, test-email)
└── layout.tsx           # Root layout

components/              # Organized by FEATURE FOLDER (not shared/reusable)
├── ui/                  # Shadcn/UI primitives (DO NOT edit directly)
├── admin/               # Admin panel components
├── alerts/              # Alert display components
├── calendar/            # Calendar view components
├── dashboard/           # Dashboard widgets and cards
├── employees/           # Employee CRUD components
├── exports/             # Export feature components
├── feedback/            # In-app feedback components
├── forecasting/         # Forecast display components
├── forms/               # Form components
├── gdpr/                # GDPR feature components
├── import/              # Import feature components
├── layout/              # Layout components (header, sidebar, etc.)
├── marketing/           # Public marketing page components
├── mfa/                 # MFA setup/verification components
├── navigation/          # Nav components
├── settings/            # Settings page components
└── trips/               # Trip CRUD components

lib/
├── supabase/
│   ├── client.ts        # Browser Supabase client
│   ├── server.ts        # Server-side Supabase client
│   ├── admin.ts         # Admin Supabase client (service_role)
│   └── middleware.ts    # Supabase middleware helpers
├── db/                  # Database query layer (one file per entity)
│   ├── alerts.ts, companies.ts, employees.ts, feedback.ts,
│   ├── forecasts.ts, profiles.ts, trips.ts, index.ts
├── compliance/          # 90/180-day calculation engine (15 files)
│   ├── date-utils.ts, presence-calculator.ts, schengen-validator.ts, etc.
├── import/              # Import parsing, validation, insertion logic
├── actions/             # Server action helpers
├── billing/             # Stripe billing integration
├── calendar/            # Calendar data utilities
├── constants/           # App-wide constants (schengen-countries, etc.)
├── errors/              # Custom error classes (AuthError, ValidationError, etc.)
├── exports/             # Export generation logic
├── gdpr/                # GDPR compliance utilities
├── security/            # Security helpers (MFA enforcement, etc.)
├── services/            # Business logic services (alert detection, etc.)
├── validations/         # Zod schemas (trip, employee, etc.)
├── config.ts            # App configuration
├── permissions.ts       # Role-based permission system
├── rate-limit.ts        # Server action rate limiting
└── utils.ts             # Shared utilities

types/                   # TypeScript type definitions
├── database.ts          # Supabase generated types (auto-generated)
├── database-helpers.ts  # Helper types for DB operations
├── dashboard.ts         # Dashboard-specific types
├── forecast.ts          # Forecast types
└── import.ts            # Import feature types

hooks/                   # Custom React hooks
contexts/                # React Context providers
__tests__/               # Unit and integration tests
e2e/                     # Playwright end-to-end tests
scripts/                 # Build and utility scripts
middleware.ts            # Auth route protection
```

---

## Database Schema

### Core Tables (all have RLS enabled)

| Table               | Purpose                                          |
|---------------------|--------------------------------------------------|
| `companies`         | Multi-tenant company accounts                    |
| `profiles`          | User data (linked to auth.users via same UUID). Role: `'owner'`/`'admin'`/`'manager'`/`'viewer'` |
| `employees`         | Tracked employees — name + `nationality_type` (required: `'uk_citizen'`, `'eu_schengen_citizen'`, `'rest_of_world'`). Used for 90/180 exemption logic |
| `trips`             | Travel records with computed `travel_days`        |
| `alerts`            | Compliance risk alerts per employee              |
| `company_settings`  | Per-company config (retention, thresholds)        |
| `audit_log`         | Tamper-evident audit trail (hash-chained)         |
| `schengen_countries`| Reference data — 32 countries (read-only, no RLS)|

### Additional Tables

| Table                            | Purpose                                          |
|----------------------------------|--------------------------------------------------|
| `company_entitlements`           | Tier/billing entitlements per company (linked to `tiers`) |
| `tiers`                          | Pricing tier lookup (read-only, no RLS)          |
| `company_user_invites`           | Team invite-based onboarding                     |
| `employee_compliance_snapshots`  | Precomputed compliance status cache (hash-invalidated on trip changes) |
| `import_sessions`               | Tracks data import operation state               |
| `column_mappings`               | Saved import column mappings                     |
| `background_jobs`               | Async job queue (bulk recalc, export, import)    |
| `notification_log`              | Audit trail of all email notifications sent      |
| `notification_preferences`      | Per-user email notification opt-in flags         |
| `feedback_submissions`          | In-app user feedback capture                     |
| `mfa_backup_codes`              | MFA backup codes for 2FA recovery                |
| `mfa_backup_sessions`           | MFA session state                                |
| `admin_audit_log`               | Admin-scoped audit trail (separate from company `audit_log`) |
| `waitlist`                       | Pre-launch waitlist (supports encrypted email storage) |

### Database Functions

14+ security-definer functions exist for RLS helpers, auth triggers, and audit integrity:
- `get_current_user_company_id()` — RLS optimization for company isolation
- `get_current_user_role()` — Returns user's role from profile
- `create_company_and_profile()` — Idempotent company + profile creation
- `get_dashboard_summary()` — Aggregated compliance data (JSON)
- `get_last_audit_hash()` — Hash-chain integrity for audit log
- `handle_auth_user_if_needed()` / `handle_oauth_user_if_needed()` — Auth triggers
- `invalidate_compliance_snapshot()` — Trigger on trip changes
- `prevent_audit_log_modifications()` — Append-only enforcement
- `rls_auto_enable()` — Event trigger to auto-enable RLS on new tables

### Key Relationships

```
companies (1) → (N) profiles
companies (1) → (N) employees
employees (1) → (N) trips
employees (1) → (N) alerts
companies (1) → (1) company_settings
companies (1) → (N) audit_log
```

### Computed Columns

- `trips.travel_days` = `exit_date - entry_date + 1` (PostgreSQL GENERATED ALWAYS AS STORED)

### Key Constraints

- `trips.exit_date >= trips.entry_date` (CHECK constraint)
- `trips.country` must be exactly 2 characters (ISO code)
- `profiles.role` must be one of `'owner'`, `'admin'`, `'manager'`, `'viewer'`
- `employees.nationality_type` must be one of `'uk_citizen'`, `'eu_schengen_citizen'`, `'rest_of_world'` (NOT NULL)

---

## Multi-Tenancy (CRITICAL)

Every data query MUST be isolated by company. Two layers of protection:

1. **Database layer:** Row Level Security (RLS) policies on every table filter by `company_id` derived from `auth.uid()`
2. **Application layer:** Every query must ALSO explicitly filter by `company_id` — never trust RLS alone

### RLS Performance Rules

- Index ALL columns referenced in RLS policies
- Use scalar subquery pattern: `(SELECT auth.uid())` instead of bare `auth.uid()` to prevent per-row evaluation
- Use Supabase connection pooler on port `6543` with `?pgbouncer=true`

### Security Keys

- `anon` key: Safe for frontend (browser client)
- `service_role` key: **NEVER in frontend** — server-side only (Edge Functions, server actions)

---

## Core Business Logic: 90/180-Day Rule

### The Rule

A non-EU citizen may stay in the Schengen area for a maximum of **90 days** within any rolling **180-day window**.

### Schengen Countries (32 total)

**Full members (28):** AT, BE, BG, HR, CZ, DK, EE, FI, FR, DE, GR, HU, IS, IT, LV, LI, LT, LU, MT, NL, NO, PL, PT, RO, SK, SI, ES, SE, CH

**Microstates (4 — de facto Schengen, open borders):** MC (Monaco), VA (Vatican), SM (San Marino), AD (Andorra)

### CRITICAL EXCLUSIONS — NOT Schengen

- **Ireland (IE)** — EU member, opted OUT of Schengen
- **Cyprus (CY)** — EU member, has NOT joined Schengen

Trips to IE and CY must NEVER count toward the 90-day limit.

### Calculation Algorithm

```
1. presence_days(trips):
   - Filter to Schengen-country trips only
   - Generate every date from entry_date to exit_date (INCLUSIVE — both days count)
   - Add to a Set (auto-deduplicates overlapping trips)
   - Return Set<Date>

2. days_used_in_window(presence, reference_date):
   - window_start = reference_date - 180 days
   - window_end = reference_date - 1 day
   - Count presence days that fall within [window_start, window_end]
   - Return number

3. days_remaining = 90 - days_used_in_window

4. Risk levels:
   - Green:  ≥30 days remaining
   - Amber:  10–29 days remaining
   - Red:    <10 days remaining (or negative = violation)
```

### Date Handling (CRITICAL — liability risk)

```typescript
// ✅ CORRECT — use date-fns for ALL date operations
import { parseISO, eachDayOfInterval, subDays, isWithinInterval } from 'date-fns'
const tripStart = parseISO('2025-10-12')

// ❌ WRONG — native Date has timezone-dependent behavior
const tripStart = new Date('2025-10-12')  // Can shift ±1 day depending on TZ
```

**NEVER** use `new Date('YYYY-MM-DD')` for compliance calculations. Always `parseISO()`.

---

## Data Mutation Pattern

Use **Server Actions** for all data mutations (not API routes). Actions are thin wrappers that delegate to:
- **Auth + permissions:** `enforceMutationAccess()` in the action file
- **Validation:** Zod schemas in `lib/validations/`
- **DB operations:** Query functions in `lib/db/` (these resolve `company_id` internally)
- **Errors:** Custom classes from `lib/errors/` (`AuthError`, `ValidationError`, `NotFoundError`, `DatabaseError`)

```typescript
// ✅ CORRECT pattern — app/(dashboard)/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createTrip } from '@/lib/db'
import { tripSchema } from '@/lib/validations/trip'
import { checkServerActionRateLimit } from '@/lib/rate-limit'

export async function addTripAction(formData: { ... }) {
  await checkServerActionRateLimit('addTripAction')
  await enforceMutationAccess(PERMISSIONS.TRIPS_CREATE, 'addTripAction')
  const validated = tripSchema.parse(formData)
  const trip = await createTrip(validated)  // company_id resolved inside lib/db/
  revalidatePath('/dashboard')
  return trip
}
```

**Key rules:**
- `company_id` is resolved inside `lib/db/` from the authenticated user's profile — NEVER from form/request data
- Permission checks use `enforceMutationAccess()` with role-based permissions (`'owner'`/`'admin'`/`'manager'`/`'viewer'`)
- Rate limiting via `checkServerActionRateLimit()` on all public-facing actions
- Always `try/catch` async operations
- Use `revalidatePath()` after mutations

---

## Supabase Client Usage

```typescript
// Server Components & Server Actions
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client Components (browser)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

After schema changes, regenerate types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

---

## Alert Thresholds

| Trigger         | Days Used | Action                    |
|-----------------|-----------|---------------------------|
| Warning         | 75+       | Alert created             |
| High Risk       | 85+       | Elevated alert            |
| Critical/Limit  | 90        | Violation — overstay risk |

---

## What NOT to Do

- ❌ Use `new Date()` for compliance date math
- ❌ Trust `company_id` from client/form data
- ❌ Skip RLS policies on new tables
- ❌ Use `service_role` key in frontend code
- ❌ Use API routes when server actions work
- ❌ Use `any` type in TypeScript
- ❌ Treat Ireland (IE) or Cyprus (CY) as Schengen
- ❌ Use purple gradients, sparkle emojis, or placeholder "#" links
- ❌ Ship UI without loading states for async operations
