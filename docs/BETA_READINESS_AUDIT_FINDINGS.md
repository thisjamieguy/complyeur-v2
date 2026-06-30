# ComplyEUR — Beta Readiness Audit: Findings

**Audit date:** 30 June 2026
**Method:** Source-of-truth inspection of the repository (migrations, server actions,
billing handlers, compliance engine) plus execution of the compliance test suite.
**Scope of this pass:** Track A items that are verifiable from code, and the
code-level portions of Track B. Live-connector checks that need interactive
approval are listed as **Blocked** with what to run once unblocked.

> This document fills in the audit plan in the issue/brief. Severity uses the same
> P0 / P1 / P2 levels.

---

## Executive summary

The product is in **good shape** for a controlled beta. The two items that "can
sink you" — the **90/180 calculation engine** and **multi-tenant RLS** — are both
strong, with deep test coverage and defensive database constraints.

The one **material gap** found in code is **billing cap enforcement (B4)**: the
per-tier traveller limit (`max_employees`) is **not enforced on any write path**.
A Basic-tier company can add unlimited travellers. This is a revenue/limits
integrity issue, not a data-security one, but it should be fixed before wide beta.

| Area | Verdict | Severity |
|------|---------|----------|
| B1 — 90/180 calculation engine | ✅ Strong | — |
| A1/A2 — RLS & tenant isolation | ✅ Strong | — |
| A3 — Service-role key exposure | ✅ Pass (minor hardening) | P2 |
| A6 — Stripe webhook robustness | ✅ Strong | — |
| A7 — Sentry wiring | ✅ Wired (confirm delivery live) | P1 (verify) |
| A8 — Data residency | ✅ EU/UK | — |
| **B4 — Traveller cap enforcement** | ❌ **Not enforced** | **P1** |
| A4/A5 — Vercel live checks | ⏸ Blocked on approval | — |

---

## Track A — Infra checks

### A1 / A2 — RLS & multi-tenant isolation — ✅ Strong

Verified from migrations (the authoritative schema definition):

- **Restrictive tenant guard on 16 tables.** `20260414220000_complete_tenant_isolation_hardening.sql`
  installs an `AS RESTRICTIVE` `tenant_active_guard` policy across `alerts`,
  `audit_log`, `background_jobs`, `column_mappings`, `companies`,
  `company_entitlements`, `company_settings`, `company_user_invites`,
  `employee_compliance_snapshots`, `employees`, `feedback_submissions`,
  `import_sessions`, `notification_log`, `notification_preferences`, `profiles`,
  `trips` (and `jobs` when present). Restrictive policies are AND-combined, so they
  cannot be bypassed by a permissive policy.
- **Composite foreign keys prevent cross-tenant row stitching.** `trips`, `alerts`,
  and `employee_compliance_snapshots` carry `(employee_id, company_id)` FKs to
  `employees (id, company_id)`, so a row cannot reference an employee from another
  company even if `company_id` were spoofed.
- **`get_current_user_company_id()`** is the single tenant boundary, used by policies
  (cached per-statement per CLAUDE.md).
- **Append-only audit log** enforced by a `BEFORE UPDATE OR DELETE` trigger plus
  restrictive no-update / no-delete policies.
- **`rls_auto_enable()` event trigger** is present (referenced across
  `20260206082114`, `20260218221914`, `20260528120000`) — new tables get RLS by default.
- **Quarantine + waitlist** locked to `service_role` only (`USING (false)` for `authenticated`).

There are also dedicated tests/scripts that exercise this:
`lib/security/__tests__/tenant-isolation.test.ts`,
`__tests__/unit/security/phase3-rls-rpc-hardening.test.ts`,
`e2e/multi-user-isolation.spec.ts`, and
`scripts/security/production-rls-attack-probe.ts`.

**Blocked / recommended:** Run `get_advisors(type: security)` against prod
(`bewydxxynjtfpytunlcq`) and test (`ympwgavzlvyklkucskcj`) once the Supabase
connector is approved, to confirm no policy drift between migrations and live state.
This requires interactive approval and could not be run in this session.

### A3 — Service-role key exposure — ✅ Pass (P2 hardening)

- `SUPABASE_SERVICE_ROLE_KEY` is **not** prefixed `NEXT_PUBLIC_`, so Next.js will not
  inline it into the client bundle. The admin client (`lib/supabase/admin.ts`) reads
  it from `process.env` and is only invoked from server actions / API routes.
- **P2 hardening:** `lib/supabase/admin.ts` does not `import 'server-only'`. Adding it
  would make any accidental client-component import a build-time error instead of a
  silent runtime failure. Low effort, recommended.

### A4 / A5 — Vercel project + runtime errors — ⏸ Blocked

Requires interactive approval of the Vercel connector (unavailable in this
non-interactive session). Once approved, run: list projects to confirm which of
`complyeur` / `complyeur-admin-fix` / `complyeur-prod-deploy` is production and retire
the rest; then pull 7-day runtime errors and the latest build log for the live project.

### A6 — Stripe webhook — ✅ Strong

`app/api/billing/webhook/route.ts` is well-built:

- **Signature verification** via `constructWebhookEvent` before any processing.
- **Idempotency:** events are claimed by inserting into `stripe_webhook_events` on a
  unique `stripe_event_id`; duplicates short-circuit, and a 5-minute stale-reclaim
  handles crashed workers without double-processing.
- **Activation path is correct:** `checkout.session.completed` validates
  user/company/customer metadata, then writes `subscription_status: 'active'` and the
  full tier entitlement set onto `company_entitlements`. This is the "customer pays →
  subscription activates" path the audit flags as the classic launch-day failure — it
  is handled.
- Subscription updated/deleted, payment-failed email, refund and dispute alerting are
  all handled.

**Blocked / recommended:** Confirm live Stripe prices map to £27 / £87 / £197 (monthly
+ annual) and that the webhook endpoint is registered and `enabled` in the live Stripe
dashboard. The seeded tier rows use placeholder price IDs
(`price_basic_monthly_gbp`, …) that must be reconciled by `billing:prices:sync` —
verify this ran against the live account.

### A7 — Sentry — ✅ Wired (P1: confirm delivery)

`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`,
`instrumentation.ts`, and `app/global-error.tsx` are all present. Wiring is complete.
**Confirm at runtime** that events actually land in the Sentry project (throw a test
error in preview) before relying on it during beta.

### A8 — Data residency — ✅ EU/UK

Per `CLAUDE.md` / `ENVIRONMENTS.md`: production is West Europe (London) and
test/preview is Central EU (Frankfurt). Employee PII stays in the EU/UK — acceptable
for the GDPR posture HR/compliance buyers will ask about.

---

## Track B — Product checks (code-level verification)

### B1 — Schengen 90/180 calculation — ✅ Strong (the crown jewel holds)

**Test suite: 482/482 passing** (`vitest run lib/compliance/__tests__`, 13 files).

Engine review (`presence-calculator.ts`, `window-calculator.ts`, `date-utils.ts`):

- **Inclusive counting (C1):** day generation loops `entry … exit` inclusive; a
  same-day trip = 1 day. Confirmed by tests "same-day trip = 1 day".
- **True rolling window (C3/C4/C5):** window is `[refDate − 179, refDate]` (180 days
  inclusive), counted by string-key comparison against the presence set — not a fixed
  "reset". Tests: "trip 180 days before ref is EXCLUDED", "days expire as they fall out
  of the 180-day window", "trip spanning window boundary only counts days in window".
- **90 = exhausted, 91 = breach (C2):** `isCompliant` uses `daysUsed <= 90`; tests
  confirm "90 days used = EXHAUSTED BUT COMPLIANT" and `isCompliant=true` at 90.
- **Timezone safety (C8):** all dates normalized to UTC midnight; DB strings parsed via
  `parseDateOnlyAsUTC` **at the data-flow boundary** (`lib/data/employees.ts:151-152`),
  not just in tests. No native `new Date('YYYY-MM-DD')` in the hot path.
- **Leap year (C7):** UTC millisecond arithmetic; test "correctly counts Feb 29 (2024)".
- **Open/active trips (C10):** null `exitDate` counts through the reference date;
  planning mode extends to a future reference date.
- **Planning vs audit mode (C6):** `mode: 'audit'` excludes future trips and clips
  spanning trips to the reference date; planning mode includes them — feeds forecasting.

This is the strongest part of the codebase. No defects found.

### B2 — Multi-tenant isolation — ✅ Strong (see A1/A2)

Enforced at the database layer (restrictive policies + composite FKs), not just the UI.
Manual two-account walkthrough (including pasting Company A record URLs while logged in
as B) is still worth doing as a final confirmation, but the structural controls are sound.

### B4 — Traveller cap enforcement — ❌ NOT ENFORced — **P1 launch blocker for wide beta**

**The per-tier `max_employees` limit is not enforced on any employee-creation path.**

- `createEmployee` (`lib/db/employees.ts:127`) checks name-uniqueness and inserts —
  it does **not** count existing employees against the tier cap.
- The server actions `addEmployeeAction` / `addEmployeeWithTripsAction`
  (`app/(dashboard)/actions.ts:101,122`) call `enforceMutationAccess`, which only
  checks **permission + rate limit** — no cap.
- The bulk import inserter (`lib/import/inserter.ts`) and onboarding actions
  (`app/(onboarding)/onboarding/actions.ts`) likewise have no cap check.
- No database trigger enforces it — `max_employees` appears in migrations only as a
  column and as seeded tier values, never in an INSERT guard.
- `enforceBillingEntitlements` (`lib/billing/entitlement-middleware.ts`) **does** gate
  usage, but on **team-user seats** (`get_company_seat_usage` = users + invites), which
  is a different limit from traveller/employee count, and it is wired for API-route
  middleware — not the employee mutation path.

**Impact:** A Basic-tier customer (intended cap ~5 travellers) can add unlimited
travellers; Pro/Pro+ caps are equally unenforced. Tier pricing is differentiated by
traveller count, so this is a direct revenue-integrity gap.

**Recommended fix (defense in depth):**
1. **App-level guard** in `createEmployee` / bulk insert: read the company's
   `max_employees`, count active employees, reject with a clear upgrade-prompt error
   when the new total would exceed the cap (mirror the message style of
   `enforceBillingEntitlements`'s "Seat limit reached" 403).
2. **DB trigger** (`BEFORE INSERT ON employees`) as the authoritative backstop, so the
   limit holds even if a new write path is added later — consistent with how this repo
   already favours database-level enforcement for tenant isolation.

I did not implement this change — it has product/UX decisions (exact caps, trial
behaviour, error copy) that should be confirmed first. Happy to implement on the go-ahead.

### B5 — Trip data integrity — ✅ Present

Validation helpers exist for range (`exit >= entry`), far-past/far-future thresholds,
inclusive duration, and overlap (`lib/validations/dates.ts`, `trip.ts`,
`trip-overlap.ts`). Worth a manual pass on the overlap UX (warn vs merge) per the
checklist, but the guards are in place.

---

## What still needs you (Blocked on interactive connector approval)

These could not run in this non-interactive session and need the connector prompts
approved in an interactive Claude Code session (or run by you directly):

1. **Supabase `get_advisors(security)`** on prod + test — confirm live RLS matches
   migrations (A1).
2. **Vercel** — identify the live project, retire stale ones, pull 7-day runtime
   errors + build logs (A4/A5).
3. **Stripe dashboard** — confirm £27/£87/£197 prices, annual variants, and a live
   enabled webhook endpoint (A6).
4. **Sentry** — throw a test error in preview and confirm it arrives (A7).

The manual Track B walkthroughs (B3 auth flows, B6 alerts, B7–B12 UX/states) remain
yours to run as a beta user — no code blocker found that would stop them.

---

## Priority actions before wide beta

1. **P1 — Enforce `max_employees`** on employee create + import (app guard + DB trigger). [B4]
2. **P1 — Confirm Sentry is receiving events** and the live Stripe webhook is enabled. [A7/A6]
3. **P2 — Add `import 'server-only'`** to `lib/supabase/admin.ts`. [A3]
4. Run the four blocked live checks above once connectors are approved.
