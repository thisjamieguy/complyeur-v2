# CLAUDE.md — ComplyEur Development Context

## Project Overview
**ComplyEur** is a B2B SaaS application helping companies track employee travel compliance with the EU's 90/180-day Schengen visa rule. Target market: UK businesses with employees traveling to the EU post-Brexit.

- **Current Version:** v2.0 (Supabase rebuild)
- **Developer:** Solo founder, AI-assisted development workflow

> This file is the agent's always-loaded context. It is kept lean on purpose —
> operational reference (setup, commands, migrations, file structure, UI/UX and
> security detail) lives in the docs linked under **Key Project Documents**.

---

## Tech Stack
- **Frontend:** Next.js (App Router) + React + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Hosting:** Vercel

**Local setup, env vars, commands, and the migration push workflow** are in
`docs/DEVELOPMENT.md` and `docs/ENVIRONMENTS.md`. The canonical environment and
migration **policy** is `docs/architecture/ENVIRONMENTS.md` and
`docs/architecture/MIGRATION_WORKFLOW.md`.

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

## UI/UX Standards (Non-Negotiable)

Full detail (spacing, visual consistency, red flags) in `docs/standards/ui-ux-standards.md`.

- **8px spacing system** everywhere; **12px border radius** everywhere — no mixing
- Mobile-first, responsive; one heading font + one body font; small intentional palette
- **Loading states for ALL async actions**; error and empty states for all data displays
- **No placeholder "#" links** — every button/link must work or be visibly disabled
- **Specific copy** — no generic filler; no sparkle-emoji UI, no fake testimonials

---

## Security Checklist

Full security standards (pre-deploy checklist, CSP headers, tenant isolation, logging/PII)
live in `docs/standards/security-standards.md`. The essentials:

- [ ] No `service_role` key in frontend code
- [ ] RLS policies on all tables
- [ ] Environment variables not in Git
- [ ] TypeScript compiles without errors
- [ ] No `console.log` with sensitive data

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
| Local development guide | `docs/DEVELOPMENT.md` | Env setup, Supabase local, file structure, commands, health/test workflow |
| Environment reference | `docs/ENVIRONMENTS.md` | Concrete project refs, migration push commands & gotchas |
| Environment policy (canonical) | `docs/architecture/ENVIRONMENTS.md` | Source of truth for environment separation |
| Migration policy (canonical) | `docs/architecture/MIGRATION_WORKFLOW.md` | How schema changes promote to production |
| UI/UX standards | `docs/standards/ui-ux-standards.md` | Full UI/UX rules |
| Security standards | `docs/standards/security-standards.md` | Pre-deploy checklist, CSP, tenant isolation |
| Architecture overview | `memory/ARCHITECTURE.md` | System design, data flow, component structure |
| Code conventions | `memory/CONVENTIONS.md` | Naming, patterns, style rules |
| Performance audit | `memory/PERFORMANCE-AUDIT.md` | 60 performance issues with prioritised fix plan (audit date: 2026-02-18) |
| Security audit | `memory/SECURITY-AUDIT.md` | Application security findings and remediation |

To re-run the performance audit, prompt: `Run a full performance audit on the codebase after clearing chat`

---

## Notes
- I use OneNote for planning/documentation
- Incremental progress > big bang changes

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
