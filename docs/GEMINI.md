# ComplyEur — AI Coding Assistant Context

## Project Overview
**ComplyEur** is a B2B SaaS application helping companies track employee travel compliance with the EU's 90/180-day Schengen visa rule. Target market: UK businesses with employees traveling to the EU post-Brexit.

- **Current Version:** v2.0 (Supabase rebuild)
- **Developer:** Solo founder, AI-assisted development workflow

## Tech Stack
- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Payments:** Stripe
- **Styling:** Tailwind CSS + Shadcn/UI
- **Hosting:** Vercel
- **Testing:** Vitest (unit), Playwright (e2e)

---

## Critical Rules

### Date Handling (HIGH PRIORITY)
**Do NOT use native JavaScript `Date` objects for 90/180 calculations.**

Native JS dates have timezone issues — a trip on "Oct 12" can shift days based on browser timezone.

```typescript
// CORRECT - use date-fns, treats as local date
import { parseISO, differenceInDays } from 'date-fns'
const tripStart = parseISO('2025-10-12')

// WRONG - timezone issues
const tripStart = new Date('2025-10-12') // NEVER DO THIS
```

### TypeScript is Non-Negotiable
- All new files must be `.ts` or `.tsx`
- Define interfaces for all props, API responses, database types
- Strict mode enabled — no `any` unless absolutely necessary
- Interface over type for object shapes
- Use Supabase generated types from `types/database.ts`

### Row Level Security (MANDATORY)
Every Supabase table must have RLS enabled. No exceptions.
```sql
-- Uses get_current_user_company_id() for performance (cached per-statement)
CREATE POLICY "Users see own employees"
  ON employees FOR SELECT
  USING (company_id = (SELECT get_current_user_company_id()));
```

### Security
- **anon key:** Safe in frontend
- **service_role key:** NEVER in frontend — server/Edge Functions only
- No `console.log` with sensitive data in production
- Environment variables never committed to Git

---

## Code Standards

### React/Next.js
- Functional components only
- Custom hooks for shared logic
- Server components where possible (App Router)
- Client components only when needed (`'use client'`)

### Error Handling
- Try/catch on all async operations
- User-friendly error messages (not raw errors)
- Toast notifications for user feedback

### UI/UX Standards
- **8px spacing system** for all margins, padding, gaps
- **12px border radius everywhere** — no mixing
- Mobile-first, responsive design
- Loading states for ALL async actions
- No placeholder "#" links — every button/link must work or be visibly disabled
- Error states and empty states for all data displays
- No sparkle emojis, fake testimonials, or generic filler copy

---

## Key Domain Concepts

### 90/180-Day Rule
- Non-EU citizens can stay max 90 days within any rolling 180-day period in Schengen Area
- Each day's compliance = count trips in previous 180 days
- "Days remaining" = 90 minus days used in rolling window
- Use ISO date strings (`'2025-10-12'`) for all calculations

### Core Entities
- **Companies** — the paying customer (auth.uid() = company)
- **Employees** — people being tracked (belong to a company)
- **Trips** — date ranges of travel to Schengen
- **Compliance Status** — calculated field (compliant/warning/violation)

### Database Schema
```
companies (id, name, email, stripe_customer_id, created_at)
employees (id, company_id, name, nationality_type, created_at)
trips (id, employee_id, company_id, entry_date, exit_date, country, travel_days, created_at)
```

- `employees.nationality_type`: `'uk_citizen'`, `'eu_schengen_citizen'`, or `'rest_of_world'`
- `trips.travel_days`: computed column (`exit_date - entry_date + 1`, PostgreSQL GENERATED ALWAYS AS STORED)
- `trips.country`: 2-character ISO code (CHECK constraint)

---

## File Structure
```
/app                 -> Next.js App Router pages
  /(auth)            -> Login, signup, password reset (public)
  /(dashboard)       -> Protected app pages (requires auth)
    /dashboard       -> Main compliance dashboard
    /employee        -> Employee CRUD (singular, has [id]/ dynamic route)
    /import          -> Excel/CSV bulk import
    /settings        -> Company settings
    /calendar        -> Calendar view of travel
    /exports         -> Data export features
    /gdpr            -> GDPR data management
    /trip-forecast   -> Trip forecasting tools
  /(public)          -> Public marketing pages
  /admin             -> Admin panel
  /api               -> API routes (health, billing, GDPR)
/components          -> Organized by FEATURE FOLDER
  /ui                -> Shadcn/UI primitives (DO NOT edit directly)
  /dashboard         -> Dashboard widgets and cards
  /employees         -> Employee CRUD components
  /trips             -> Trip CRUD components
  /import            -> Import feature components
  /settings          -> Settings page components
  /forms             -> Form components
  /layout            -> Layout components (header, sidebar)
  /navigation        -> Nav components
/hooks               -> Custom React hooks
/contexts            -> React Context providers
/lib                 -> Utilities and business logic
  /supabase          -> Supabase clients (client.ts, server.ts, admin.ts)
  /db                -> Database query layer (one file per entity)
  /compliance        -> 90/180-day calculation engine
  /validations       -> Zod schemas (trip, employee, etc.)
  /errors            -> Custom error classes
  /services          -> Business logic services
  /security          -> Security helpers
  /billing           -> Stripe billing integration
  /constants         -> App-wide constants (schengen-countries, etc.)
/types               -> TypeScript interfaces and generated Supabase types
/__tests__           -> Unit and integration tests
/e2e                 -> Playwright end-to-end tests
/supabase/migrations -> Database migrations
```

---

## Quick Commands
```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run test             # Run unit tests
npm run test:unit        # Unit tests only
npm run test:e2e         # Playwright e2e tests
npm run test:coverage    # Tests with coverage
npm run typecheck        # Type checking
npm run lint             # Linting
npm run db:types         # Generate Supabase types
```

---

## Development Approach
- Plain English, no fluff
- Small, incremental changes — never big-bang rewrites
- Make atomic, single-purpose changes
- Test adjacent features after every change
- Git commit after each working change
- If something breaks unexpectedly, STOP and audit before fixing more
