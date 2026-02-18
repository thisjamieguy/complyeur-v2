# Performance Audit Report — ComplyEur v2

**Date:** 2026-02-18
**Auditor:** Automated (Claude Opus 4.6, 4 parallel analysis agents)
**Codebase:** Next.js 16.1.1 / Supabase / Vercel / Stripe
**Branch:** `main` at commit `1ed3485`

---

## 1. Audit Methodology

Four concurrent deep-analysis passes were executed against the full codebase:

| Audit Type | Scope | Files Analysed |
|---|---|---|
| **React Component Performance** | Re-render efficiency, memoisation gaps, key antipatterns, lazy loading, state management | `components/**`, `app/**` |
| **Database & API Patterns** | N+1 queries, unbounded fetches, waterfall requests, missing indexes, over-fetching, redundant queries, pagination gaps | `lib/db/**`, `lib/services/**`, `lib/data/**`, `app/**/actions.ts`, `app/**/page.tsx`, `app/api/**` |
| **Bundle Size & Imports** | Wildcard imports, heavy client dependencies, missing dynamic imports, barrel file leakage, font/asset optimisation | `components/**`, `lib/**`, `app/**`, `package.json`, `public/**` |
| **Server-Side & Caching** | Layout/page waterfalls, missing `React.cache()`, middleware cost, static vs dynamic classification, streaming opportunities, server action inefficiencies, memory leaks, algorithm complexity | `app/**/layout.tsx`, `app/**/page.tsx`, `middleware.ts`, `lib/compliance/**`, `lib/services/**`, `next.config.ts` |

**To re-run this audit**, prompt Claude Code with:

```
Run a full performance audit on the codebase after clearing chat
```

This triggers the same four parallel agents. Compare results against the findings below to verify completed fixes and identify any regressions.

---

## 2. Executive Summary

- **60 unique issues** identified across the four audit domains.
- **20 rated HIGH** — these have measurable impact on page load times, server costs, or correctness.
- **29 rated MEDIUM** — meaningful improvements, lower urgency.
- **11 rated LOW** — cleanup items with minimal user-facing impact.

The most significant performance bottleneck is the dashboard's `getEmployeeStats` function, which fetches every employee and every trip from the database on each page load, then runs full compliance calculations in JavaScript. Combined with uncached `requireCompanyAccess` calls (which duplicate `auth.getUser()` + profile lookups across every DB function), a single dashboard page load can trigger 10-15 redundant database round-trips.

On the client side, the `xlsx` library (~500 KB gzipped) is statically imported into the client bundle via a `'use client'` page, and zero `next/dynamic` usage means all 143 client components are eagerly bundled regardless of route.

---

## 3. Findings — HIGH Priority

Each finding includes the file, line reference, root cause, and recommended fix.

---

### H-01: `requireCompanyAccess` not cached — duplicated on every DB function call

**Category:** Redundant Queries
**File:** `lib/security/tenant-access.ts:15-61`

**Problem:** Every database function in `lib/db/` calls `requireCompanyAccess()`, which internally calls `supabase.auth.getUser()` then queries the `profiles` table. In a single page render that calls 3 DB functions, this fires 6 redundant Supabase round-trips just for auth context resolution.

**Fix:** Wrap with `React.cache()`:

```typescript
import { cache } from 'react'

export const requireCompanyAccess = cache(async (
  supabase: SupabaseClient,
  targetCompanyId?: string,
  options: CompanyAccessOptions = {}
): Promise<CompanyAccessContext> => {
  // existing implementation
})
```

`cache()` is request-scoped, so the resolved `{ userId, companyId, role }` is computed once per server render and reused across all DB calls.

**Verification:** Dashboard page load should show only 1 `auth.getUser()` + 1 profile query (down from 4-6). Check Supabase logs or add timing instrumentation.

---

### H-02: Middleware runs a `profiles` DB query on every authenticated request

**Category:** Expensive Middleware
**File:** `lib/supabase/middleware.ts:34-65`

**Problem:** `updateSession()` runs `auth.getUser()` (JWT validation, network call) then queries `profiles` for `onboarding_completed_at` on every single authenticated page navigation. In a serverless environment, each middleware invocation is a fresh execution context — no caching between requests.

**Fix (short-term):** Store `onboarding_completed_at` as a boolean in Supabase user metadata. Read it from `user.user_metadata.onboarding_completed` in middleware (already available from the JWT, zero extra queries).

**Fix (long-term):** Use a Supabase `set_claim` hook or update user metadata on onboarding completion so the JWT carries the claim natively.

**Verification:** After fix, middleware should make exactly 1 network call (`auth.getUser()`), not 2. Measure TTFB before/after on authenticated routes.

---

### H-03: `getEmployeeStats` fetches all employees + all trips on every dashboard page load

**Category:** Unbounded Query + Inefficient Algorithm
**File:** `lib/data/employees.ts:407-543`

**Problem:** `getEmployeeComplianceDataPaginated` fetches a paginated slice of employees, then calls `getEmployeeStats()` which runs a second query to fetch *every* employee with *all* their trips. It then runs `calculateCompliance()` in a JavaScript `for` loop over every employee. For a company with 200 employees and 4,000 trips, this transfers the entire dataset over the network and processes it in-memory on every page load.

**Fix (short-term):** Cache with `unstable_cache` keyed by `(companyId, today)` with `revalidate: 300`. Bust on trip/employee mutations via `revalidateTag()`.

**Fix (long-term):** Replace with a PostgreSQL aggregate function that computes status buckets (`compliant`, `at_risk`, `non_compliant`, `breach`, `exempt`) in a single `SELECT`. The codebase already has a disabled `SNAPSHOTS_ENABLED` flag and a `get_dashboard_summary` RPC comment — this is the intended path.

**Verification:** Dashboard page load should not query the full employees + trips tables. Check query logs for the `getEmployeeStats` query disappearing.

---

### H-04: Two separate `getCompanySettings` implementations, neither cached

**Category:** Redundant Queries
**Files:** `lib/actions/settings.ts:19-88` and `lib/db/alerts.ts:325-366`

**Problem:** Two independent implementations exist with different return shapes. Neither uses `React.cache()`. When the dashboard loads, both may be invoked in the same request lifecycle — duplicating work.

**Fix:** Consolidate into a single canonical function. Wrap with `React.cache()`. Remove the duplicate.

**Verification:** Search the codebase for `getCompanySettings` — there should be exactly one implementation after the fix.

---

### H-05: `checkEntitlement` makes a fresh DB query per feature flag

**Category:** Missing Caching
**File:** `lib/billing/entitlements.ts:23-35`

**Problem:** Each call to `checkEntitlement('can_calendar')`, `checkEntitlement('can_forecast')`, etc. issues a separate Supabase query to `company_entitlements`. Pages checking multiple flags multiply this cost.

**Fix:** Rewrite to use `getCompanyEntitlements()` (bulk fetch, already exists) and extract the specific flag. Wrap `getCompanyEntitlements` in `React.cache()`:

```typescript
export const getCompanyEntitlements = cache(async () => { /* existing impl */ })

export async function checkEntitlement(flag: EntitlementFlag): Promise<boolean> {
  const entitlements = await getCompanyEntitlements()
  return (entitlements as Record<string, boolean | null>)?.[flag] ?? false
}
```

**Verification:** Multiple `checkEntitlement` calls in a single request should produce only 1 DB query.

---

### H-06: Fire-and-forget alert detection fails silently in serverless

**Category:** Server Action Inefficiency
**File:** `app/(dashboard)/actions.ts:63-67`

**Problem:** `runAlertDetectionBackground()` uses a `.catch(() => {})` pattern to run alert detection after trip mutations. In a Vercel serverless function, the execution context terminates when the response is sent — uncaught promises are abandoned before completion. Alert detection (which makes 3-5 DB calls) may silently never complete.

**Fix:** Use one of:
- `waitUntil` from `@vercel/functions` (if on Vercel Edge)
- A Supabase Database Trigger + Edge Function (most robust)
- A queued background job via API endpoint + Vercel Cron

**Verification:** Trigger a trip that crosses a threshold. Confirm alert is created in `alerts` table and email is sent.

---

### H-07: N+1 query in GDPR retention cron — per-employee COUNT

**Category:** N+1 Query
**File:** `lib/gdpr/retention.ts:219-232`

**Problem:** The orphaned-employee check issues a separate `COUNT(*)` query per employee inside a `for` loop. 100 orphaned employees = 100 sequential queries.

**Fix:** Pull all trip counts in one query: `SELECT employee_id, COUNT(*) FROM trips WHERE employee_id = ANY($1) GROUP BY employee_id`. Filter in-memory.

**Verification:** GDPR retention cron should show a single trips COUNT query regardless of employee count.

---

### H-08: N+1 query in import inserter — per-employee trip lookup

**Category:** N+1 Query
**File:** `lib/import/inserter.ts:594-613`

**Problem:** During bulk imports, duplicate-trip checking fires a separate query per unique employee ID encountered. A 500-row import spanning 50 employees = 50 sequential queries.

**Fix:** Before the main loop, collect all unique employee IDs, fetch all their trips in one `.in('employee_id', uniqueIds)` query, group into a Map.

**Verification:** Bulk import should show 1 trip-lookup query regardless of employee count.

---

### H-09: Missing composite index on `alerts` table

**Category:** Missing Index
**Table:** `alerts`

**Problem:** `hasActiveAlertOfType()` (called on every trip mutation) filters on `(employee_id, alert_type, resolved)`. Without a composite index, this is a filtered table scan.

**Fix:**

```sql
CREATE INDEX idx_alerts_employee_type_resolved
ON alerts (employee_id, alert_type, resolved)
WHERE resolved = false;
```

**Verification:** `EXPLAIN ANALYZE` on the query should show Index Scan, not Seq Scan.

---

### H-10: Missing composite index on `trips` table

**Category:** Missing Index
**Table:** `trips`

**Problem:** Trip overlap checking (on every create/update/reassign) queries `trips` filtered by `employee_id`. Without an index covering `(employee_id, entry_date, exit_date)`, PostgreSQL scans all trips for the employee.

**Fix:**

```sql
CREATE INDEX idx_trips_employee_dates
ON trips (employee_id, entry_date, exit_date);
```

**Verification:** `EXPLAIN ANALYZE` on overlap-check query should show Index Scan.

---

### H-11: Dashboard page redundant `auth.getUser()` call

**Category:** Waterfall
**File:** `app/(dashboard)/dashboard/page.tsx:88-95`

**Problem:** `DashboardPage` calls `supabase.auth.getUser()` independently even though the parent `DashboardLayout` already performed this check. App Router layouts and pages run in separate async chains — Supabase deduplication does not span across them.

**Fix:** Remove the manual `auth.getUser()` from `DashboardPage`. The layout already validates auth and redirects. Alternatively, use `React.cache()` on auth resolution so it is deduplicated within the request.

**Verification:** Supabase logs should show 1 `auth.getUser()` call per dashboard page load, not 2.

---

### H-12: Settings page sequential 5-6 round-trip waterfall

**Category:** Waterfall
**File:** `app/(dashboard)/settings/page.tsx:97-127`

**Problem:** The settings page runs: `auth.getUser()` -> `Promise.all([getCompanySettings, getUserPreferences, getCompanyEntitlements])` -> profile query -> company query. The `getCompanySettings` action internally duplicates `auth.getUser()` + profile. Total: 5-6 sequential DB calls.

**Fix:** Fold the Stripe customer check into the existing `Promise.all`. Eliminate the duplicate auth lookups inside `getCompanySettings` by accepting a pre-fetched `companyId` parameter or using `React.cache()`.

**Verification:** Settings page load should complete in 2-3 DB round-trips max.

---

### H-13: Profile query duplicated across every server action

**Category:** Redundant Queries
**Files:** `app/(dashboard)/actions.ts:101`, `app/(dashboard)/gdpr/actions.ts:29`, `app/(dashboard)/import/actions.ts:156`, `lib/actions/settings.ts:28`, `lib/data/compliance-snapshots.ts:175`

**Problem:** Every server action independently queries `profiles` for `(company_id, role)`. In a request that triggers multiple actions, this query fires multiple times.

**Fix:** Create a cached profile fetcher:

```typescript
import { cache } from 'react'

export const getCachedProfile = cache(async (supabase, userId) =>
  supabase.from('profiles').select('company_id, role').eq('id', userId).single()
)
```

**Verification:** A single request should show exactly 1 profile query regardless of how many server actions are invoked.

---

### H-14: `xlsx` (~500 KB gzipped) in client bundle

**Category:** Bundle Size
**File:** `app/(dashboard)/import/upload/page.tsx:12` -> `lib/import/parser.ts:1`

**Problem:** The upload page is `'use client'` and statically imports `parser.ts`, which imports from `xlsx`. The entire library (no ESM build, no tree-shaking) is included in the client bundle for every user, even those who never use the import feature.

**Fix:** Convert to a dynamic import inside the event handler:

```typescript
const handleFileSelect = async (file: File) => {
  const { parseFileRaw } = await import('@/lib/import/parser')
  // ...
}
```

**Verification:** Run `next build` and check the route-specific bundle sizes. The import/upload chunk should drop by ~500 KB.

---

### H-15: CookieYes script blocks rendering with `beforeInteractive`

**Category:** Render Blocking
**File:** `app/layout.tsx:47-52`

**Problem:** `strategy="beforeInteractive"` prevents the page from becoming interactive until the CookieYes JS fully downloads and executes. This blocks hydration on every page.

**Fix:** Change to `strategy="afterInteractive"`. CookieYes works correctly with deferred loading — its documentation recommends this for Next.js.

**Verification:** Measure Largest Contentful Paint (LCP) and Time to Interactive (TTI) before/after. Expect a measurable improvement.

---

### H-16: Zero `next/dynamic` usage — no code splitting

**Category:** Missing Code Splitting
**Files:** Multiple — `components/calendar/calendar-view.tsx`, `components/trips/bulk-add-trips-modal.tsx`, various modals

**Problem:** With 143 `'use client'` components and heavy libraries, the complete absence of dynamic imports means every component is eagerly bundled. Prime candidates:

- **`GanttChart`** — includes `@tanstack/react-virtual`, only needed on `/calendar`
- **`QuickAddTripModal`** — always imported, rarely opened
- **`BulkAddTripsModal`** — heavy form chain
- **`DashboardTour`** — renders once per user ever
- **All GDPR components** — only used on `/gdpr`

**Fix:** Apply `next/dynamic` with `{ ssr: false }` to each:

```typescript
import dynamic from 'next/dynamic'

const GanttChart = dynamic(
  () => import('@/components/calendar/gantt-chart').then(m => m.GanttChart),
  { ssr: false, loading: () => <CalendarSkeleton /> }
)
```

**Verification:** Check route bundle sizes before/after. Each dynamic import should remove the component from the main chunk.

---

### H-17: `@react-pdf/renderer` exposed via barrel file

**Category:** Bundle Size Risk
**File:** `lib/exports/index.ts:53-59`

**Problem:** The exports barrel re-exports PDF generator functions alongside CSV utilities. Any file importing from `@/lib/exports` — even for CSV types only — pulls `@react-pdf/renderer` (~300-400 KB) into its module graph. If a client component ever imports from this barrel, the renderer leaks to the client bundle.

**Fix:** Remove PDF exports from the barrel. Import directly from `lib/exports/pdf-generator` where needed:

```typescript
// In server actions only:
import { generateIndividualPdf } from '@/lib/exports/pdf-generator'
```

**Verification:** Confirm no client-side bundle references `@react-pdf/renderer` after the change.

---

### H-18: Fragment missing `key` in ValidationTable (correctness bug)

**Category:** React Reconciliation
**File:** `components/import/ValidationTable.tsx:117`

**Problem:** The outermost element returned from `.map()` is a keyless `<>` Fragment. The `key` prop on the inner `<TableRow>` is ignored by React's reconciler. When rows are added, removed, or reordered, React does full DOM replacement instead of efficient updates, and expanded-row state can visually mismatch.

**Fix:**

```tsx
<React.Fragment key={row.row_number}>
  <TableRow>...</TableRow>
  {isExpanded && <TableRow>...</TableRow>}
</React.Fragment>
```

**Verification:** Expand a row, add/remove data, confirm the expanded state tracks the correct row.

---

### H-19: `isToday`/`isWeekend` called O(employees x dates) per calendar render

**Category:** Expensive Computation
**File:** `components/calendar/employee-row.tsx:25-38`

**Problem:** Each `EmployeeRow` calls `isToday(date)` and `isWeekend(date)` for every date cell. With 20 visible employees and 242 dates, this is 4,840 `isToday` calls per render — each creating a `new Date()` internally.

**Fix:** Pre-compute per-date flags once when `dates` changes:

```typescript
const dateMeta = useMemo(() =>
  dates.map(date => ({
    key: format(date, 'yyyy-MM-dd'),
    isWeekend: isWeekend(date),
    isToday: isToday(date),
  })),
  [dates]
)
```

Pass `dateMeta` to `EmployeeRow` instead of raw `dates`. Reduces from O(employees x dates) to O(dates).

**Verification:** Profile the calendar page with React DevTools. `EmployeeRow` render times should drop significantly.

---

### H-20: `EmployeeCard` memo defeated by inline closure

**Category:** Wasted Re-renders
**File:** `components/dashboard/compliance-table.tsx:487-494`

**Problem:** `EmployeeCard` is wrapped in `memo()`, but receives `onAddTrip={() => openAddTripModal(employee.id, employee.name)}` — a new function reference on every render. With 25 cards per page, all 25 receive a prop change signal on every state update (search keystroke, filter change, sort change).

**Fix:** Pass the stable `openAddTripModal` callback directly and let `EmployeeCard` call it with its own `employee.id` and `employee.name`:

```tsx
<EmployeeCard
  key={employee.id}
  employee={employee}
  openAddTripModal={openAddTripModal}  // stable useCallback ref
/>
```

**Verification:** Profile with React DevTools. On a search keystroke, only the search input and filtered list should re-render — not all 25 `EmployeeCard` instances.

---

## 4. Findings — MEDIUM Priority

| Ref | Category | File | Issue | Fix |
|-----|----------|------|-------|-----|
| M-01 | N+1 Query | `lib/services/alert-detection-service.ts:258` | Alert creation loop runs 2 sequential queries per threshold crossed (up to 6 total) | Fetch all active alerts for the employee in one query upfront; filter in-memory |
| M-02 | N+1 Query | `lib/gdpr/retention.ts:196` | `hardDeleteEmployee()` called per employee in a loop | Batch trip deletion with `.in()`, then batch employee deletion |
| M-03 | Waterfall | `app/(dashboard)/actions.ts:82-112` | `enforceMutationAccess` runs rate limit check and profile fetch sequentially | Wrap in `Promise.all()` after `auth.getUser()` |
| M-04 | Redundant Query | Multiple action files | `requireCompanyAccess` called alongside manual profile queries (duplicating work) | After H-01 is fixed, callers should use the cached result instead of re-querying |
| M-05 | Unbounded Query | `lib/db/trips.ts:50-54` | `getTripsByEmployeeId` has no `.limit()` | Add `.limit(500)` |
| M-06 | Unbounded Query | `lib/db/alerts.ts:110-113` | `getAlertsByEmployeeId` has no `.limit()` | Add `.limit(100)` |
| M-07 | Over-fetching | `lib/db/employees.ts:33-38` | `getEmployees()` fetches `select('*')` for a reassignment dropdown | Use `.select('id, name')` and `.limit(500)` |
| M-08 | Unbounded Query | `lib/gdpr/retention.ts:157-160` | Expired trips fetch has no `.limit()` | Process in batches of 1,000 using `.range()` |
| M-09 | Missing Index | `employees` table | `ILIKE` name search cannot use B-tree index due to leading `%` wildcard | Add trigram index: `CREATE INDEX ... USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL` |
| M-10 | Missing Index | `trips` table | Forecast query filters on `(company_id, entry_date)` with no covering index | Add: `CREATE INDEX ... ON trips (company_id, entry_date) WHERE ghosted = false` |
| M-11 | In-memory Filtering | `app/admin/companies/page.tsx:48-55` | Tier/status filters applied in-memory after paginated DB query — incorrect count | Move filters into the Supabase query before `.range()` |
| M-12 | Missing Caching | `app/(dashboard)/dashboard/page.tsx:13` | `force-dynamic` with no `unstable_cache` — all data fetched fresh on every back-button navigation | Apply `unstable_cache` keyed by `(companyId, page, search, today)` with `revalidate: 60` |
| M-13 | Streaming | `app/(dashboard)/employee/[id]/page.tsx:77-81` | No `<Suspense>` boundaries — all 3 queries block the full page render | Split into header component (immediate) and trip list (suspended) |
| M-14 | Streaming | Dashboard page | `EmployeeComplianceList` awaits settings before starting employee fetch | Parallelise settings and employee data fetches with `Promise.all()` |
| M-15 | Static vs Dynamic | `app/page.tsx:14-26` | Root `/` is `force-dynamic` just to redirect — middleware already handles this | Remove `app/page.tsx` or convert to a static redirect in middleware |
| M-16 | Bundle | `app/layout.tsx:19-21` | `Geist_Mono` font loaded globally — only used in a few debug/MFA screens | Remove from root layout; rely on Tailwind's system monospace stack |
| M-17 | Bundle | `app/layout.tsx:43-44` | Both SVG logos preloaded on ALL routes via `<link rel="preload">` | Move preloads to `(public)/layout.tsx` and `(auth)/layout.tsx` only |
| M-18 | Bundle | `components/calendar/index.ts`, `components/trips/index.ts` | Barrel files re-export heavy components, preventing granular tree-shaking | Import directly from source files in performance-critical paths |
| M-19 | React | `components/trips/country-select.tsx:72-147` | 3x `COUNTRY_LIST.filter()` on every render/keystroke | Pre-partition at module level (runs once) |
| M-20 | React | `components/trips/trip-list.tsx:87-96` | Sort computed outside `useMemo`; `new Date()` in comparator loop | Wrap in `useMemo`; use string comparison for ISO dates |
| M-21 | React | `components/trips/trip-card-mobile.tsx:66` | Not wrapped in `memo()` — re-renders on every modal toggle | Add `memo()` wrapper |
| M-22 | React | `components/dashboard/status-filters.tsx:52-77` | `FilterButton` not memoised; `filters` array rebuilt per render | Wrap `FilterButton` in `memo()`; memoise `filters` with `useMemo` |
| M-23 | React | `components/dashboard/compliance-table.tsx:512-514` | Inline `onOpenChange` lambda breaks `QuickAddTripModal` memoisation | Extract to `useCallback` |
| M-24 | React | `components/calendar/date-header.tsx:87-142` | `isToday`/`isWeekend` called per-cell in two separate render loops (~484 calls) | Pre-compute in one pass using `useMemo` (related to H-19) |
| M-25 | React | `components/import/ValidationTable.tsx:131, 153` | `index` as key for table cells and error list items | Use column header or error content as key |
| M-26 | React | `components/dashboard/compliance-table.tsx:281-323` | Client-side sort only applies to current page of paginated data (data correctness issue) | Move sort to URL params, pass to server query |
| M-27 | Algorithm | `lib/compliance/compliance-vector.ts:50-131` | O(n*d) `computeComplianceVector` still exported as public API (optimised version exists) | Remove or deprecate; redirect callers to `computeComplianceVectorOptimized` |
| M-28 | Algorithm | `lib/compliance/window-calculator.ts:119-120` | `daysUsedInWindow` allocates `Date` objects per presence day per call | Replace with ISO string comparison (lexicographic order matches chronological for `YYYY-MM-DD`) |
| M-29 | Algorithm | `lib/compliance/safe-entry.ts:44-76` | `earliestSafeEntry` calls `daysUsedInWindow` up to 180 times in a loop | Use `computeComplianceVectorOptimized` for a single O(n+d) pass |

---

## 5. Findings — LOW Priority

| Ref | File | Issue | Fix |
|-----|------|-------|-----|
| L-01 | `lib/db/trips.ts:507` | `reassignTrip` uses `select('*')` when only `id, company_id` needed | Narrow select |
| L-02 | `lib/db/companies.ts:14` | `getCompanyById` uses `select('*')` | Select only required columns |
| L-03 | `lib/db/alerts.ts:44` | `getActiveAlerts` uses `select('*')` for dashboard banner | Select only `id, alert_type, employee.name, acknowledged` |
| L-04 | `lib/actions/settings.ts:177-192` | `canViewSettings` + `canUpdateSettings` each independently call `getUser()` + profile | Merge into a single function returning both values |
| L-05 | `lib/import/actions.ts:275-295` | `getRecentImportSessions` fetches `parsed_data` JSONB blob for listing | Exclude `parsed_data` and `validation_errors` from select |
| L-06 | `lib/db/profiles.ts:109-113` | `getCompanyProfiles` missing `.limit()` | Add `.limit(200)` |
| L-07 | `app/(dashboard)/actions.ts:77` | `revalidatePath('/calendar')` is a no-op — page is `force-dynamic` | Remove the call |
| L-08 | `app/(dashboard)/calendar/page.tsx:61-65` | `console.log` in production server component | Remove or gate with `NODE_ENV` check |
| L-09 | Various `components/ui/` | `import * as React from 'react'` in 20+ client components | Replace with named imports where practical (Shadcn files can be left) |
| L-10 | `components/gdpr/confirm-destructive-action.tsx:128` | `index` as key for consequence list (static strings) | Use `consequence` string as key |
| L-11 | `components/alerts/alert-banner.tsx:114-120` | Severity array created inside `reduce` callback per iteration | Move array to module scope; memoise result |

---

## 6. Recommended Implementation Order

Fixes are grouped into phases. Each phase builds on the previous and can be verified independently.

### Phase 1 — Quick Wins (1-2 hours total)

These require minimal code changes and have immediate, measurable impact.

- [x] **H-15** — CookieYes `beforeInteractive` -> `afterInteractive` (5 min) ✅ *Done 2026-02-18*
- [x] **H-18** — Fragment `key` fix in ValidationTable (10 min) ✅ *Done 2026-02-18*
- [x] **L-07** — Remove no-op `revalidatePath('/calendar')` (5 min) ✅ *Done 2026-02-18*
- [x] **L-08** — Remove production `console.log` in calendar page (5 min) ✅ *Done 2026-02-18*
- [x] **M-19** — Pre-partition `COUNTRY_LIST` at module level (15 min) ✅ *Done 2026-02-18*
- [x] **M-25** — Fix `index` as key in ValidationTable cells (15 min) ✅ *Done 2026-02-18*
- [x] **L-10** — Fix `index` as key in GDPR consequence list (5 min) ✅ *Done 2026-02-18*

### Phase 2 — Caching Layer (2-4 hours total)

These eliminate the most pervasive source of redundant database calls.

- [x] **H-01** — Cache `requireCompanyAccess` with `React.cache()` ✅ *Done 2026-02-18 — added `requireCompanyAccessCached` in `lib/security/tenant-access.ts`*
- [x] **H-04** — Consolidate and cache `getCompanySettings` ✅ *Done 2026-02-18 — wrapped in `cache()` in `lib/db/alerts.ts`, `lib/actions/settings.ts` now delegates*
- [x] **H-05** — Rewrite `checkEntitlement` to use cached bulk fetch ✅ *Done 2026-02-18 — `lib/billing/entitlements.ts` rewired to cached bulk fetch*
- [x] **H-13** — Create cached profile fetcher for server actions ✅ *Done 2026-02-18 — 5 files migrated to `requireCompanyAccessCached()`*
- [x] **H-11** — Remove redundant `auth.getUser()` from dashboard page ✅ *Done 2026-02-18 — uses `requireCompanyAccessCached()` now*

### Phase 3 — Bundle Optimisation (2-4 hours total)

These reduce the amount of JavaScript shipped to the client.

- [x] **H-14** — Dynamic import for `xlsx` in upload page ✅ *Done 2026-02-18 — `await import('@/lib/import/parser')` in event handlers*
- [x] **H-16** — Add `next/dynamic` for GanttChart, modals, DashboardTour, GDPR components ✅ *Done 2026-02-18 — dynamic imports in calendar-view, dashboard page, compliance-table, employee detail; removed unused GDPR imports from server page*
- [x] **H-17** — Split PDF generator out of exports barrel ✅ *Done 2026-02-18 — removed from `lib/exports/index.ts`, direct import in `app/actions/exports.ts`*
- [x] **M-16** — Remove `Geist_Mono` from root layout ✅ *Done 2026-02-18 — removed font import, CSS variable, and body class; Tailwind `font-mono` uses system stack*
- [x] **M-17** — Move logo preloads to route-specific layouts ✅ *Done 2026-02-18 — removed manual `<link rel="preload">` from root layout; route layouts already use `<Image priority>`*
- [x] **M-18** — Direct imports instead of barrels in performance-critical paths ✅ *Done 2026-02-18 — verified barrel files are unused; all consumers already use direct imports*

### Phase 4 — React Component Performance (2-3 hours total)

These reduce unnecessary re-renders in high-frequency components.

- [x] **H-19** — Pre-compute calendar `isToday`/`isWeekend` per-date ✅ *Done 2026-02-18 — `DateMeta[]` computed once in `GanttChart`, passed to `EmployeeRow` + `DateHeader`*
- [x] **H-20** — Fix `EmployeeCard` memo breakage ✅ *Done 2026-02-18 — stable callback via `onOpenAddTrip` prop*
- [x] **M-20** — Memoise `sortedTrips` in TripList ✅ *Done 2026-02-18 — wrapped in `useMemo`; ISO string comparison instead of `new Date()`*
- [x] **M-21** — Add `memo()` to `TripCardMobile` ✅ *Done 2026-02-18*
- [x] **M-22** — Memoise `StatusFilters` and `FilterButton` ✅ *Done 2026-02-18 — both wrapped in `memo()`; `filters` array in `useMemo`*
- [x] **M-23** — Extract `onOpenChange` to `useCallback` ✅ *Done 2026-02-18 — `handleAddTripOpenChange` stable callback*
- [x] **M-24** — Pre-compute DateHeader cell flags ✅ *Done 2026-02-18 — uses `DateMeta` from `GanttChart` (same as H-19)*

### Phase 5 — Database Optimisation (2-4 hours total)

These improve query performance and add safety limits.

- [x] **H-09** — Add composite index on `alerts(employee_id, alert_type, resolved)` ✅ *Done 2026-02-18 — partial index WHERE resolved = false*
- [x] **H-10** — Add composite index on `trips(employee_id, entry_date, exit_date)` ✅ *Already existed as `idx_trips_employee_date_range`*
- [x] **M-09** — Add trigram index for employee name search ✅ *Done 2026-02-18 — `pg_trgm` extension + gin index WHERE deleted_at IS NULL*
- [x] **M-10** — Add index on `trips(company_id, entry_date)` ✅ *Done 2026-02-18 — partial index WHERE ghosted = false*
- [x] **M-05** — Add `.limit(500)` to `getTripsByEmployeeId` ✅ *Done 2026-02-18*
- [x] **M-06** — Add `.limit(100)` to `getAlertsByEmployeeId` ✅ *Done 2026-02-18*
- [x] **M-07** — Narrow `getEmployees` to `select('id, name')` with `.limit(500)` ✅ *Done 2026-02-18 — new `getEmployeesForDropdown()` function*

### Phase 6 — Architecture Improvements (1-2 days total)

These are larger refactors with the highest long-term payoff.

- [ ] **H-02** — Move `profiles` query out of middleware (JWT metadata)
- [ ] **H-03** — Replace `getEmployeeStats` with DB aggregate / `unstable_cache`
- [ ] **H-06** — Move alert detection to background job (`waitUntil` / DB trigger / Edge Function)
- [ ] **H-07** — Batch GDPR retention cron queries
- [ ] **H-08** — Batch import inserter trip lookups
- [ ] **M-13** — Add Suspense streaming to employee detail page
- [ ] **M-14** — Parallelise settings + employee data in dashboard
- [ ] **M-26** — Move compliance table sort to server-side
- [ ] **M-28** — Replace `Date` allocations in `daysUsedInWindow` with string comparison
- [ ] **M-29** — Optimise `earliestSafeEntry` to use compliance vector

---

## 7. Verification Protocol

After each phase is complete:

1. **Type check:** `npm run typecheck`
2. **Unit tests:** `npm run test`
3. **Production build:** `npm run build`
4. **Manual smoke test:** Navigate through dashboard, calendar, import, settings, employee detail
5. **Re-run audit:** Prompt Claude Code with the audit command to verify resolved issues no longer appear

For database index changes, verify with:

```sql
EXPLAIN ANALYZE SELECT ... -- the query that the index targets
```

Confirm the plan shows `Index Scan` rather than `Seq Scan`.

---

## 8. Previously Completed Fixes

The following issues were identified in earlier audit passes and have already been resolved:

### Batch 1 (commit `43f6802`)

| Fix | Description | Commit |
|-----|-------------|--------|
| Calendar `key={index}` | Replaced with date-string keys in `employee-row.tsx` and `date-header.tsx` | `43f6802` |
| Dashboard layout waterfall | Parallelised MFA check and profile fetch with `Promise.all()` | `43f6802` |
| XLSX wildcard import | Changed `import * as XLSX` to `import { read, utils }` | `43f6802` |
| Alert email N+1 loop | Batched notification log creation with `Promise.all()` | `43f6802` |
| Unbounded forecast queries | Added `.limit(1000)` on employees and `.limit(10000)` on trips | `43f6802` |
| Unbounded compliance cache | Added LRU eviction with `MAX_CACHE_SIZE = 500` | `43f6802` |

### Batch 2 (2026-02-18 — performance audit critical fixes)

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| H-15 | CookieYes `beforeInteractive` → `afterInteractive` | `app/layout.tsx` |
| H-18 | Fragment `key` fix in ValidationTable `.map()` | `components/import/ValidationTable.tsx` |
| M-25 | Stable cell keys in ValidationTable (`row.row_number-col-idx`) | `components/import/ValidationTable.tsx` |
| L-07 | Removed no-op `revalidatePath('/calendar')` | `app/(dashboard)/actions.ts` |
| L-08 | Removed production `console.log` in calendar page | `app/(dashboard)/calendar/page.tsx` |
| H-01 | Added `requireCompanyAccessCached` with `React.cache()` | `lib/security/tenant-access.ts` |
| H-04 | Consolidated & cached `getCompanySettings` (single source of truth) | `lib/db/alerts.ts`, `lib/actions/settings.ts` |
| H-05 | Rewrote `checkEntitlement` to use cached bulk fetch | `lib/billing/entitlements.ts` |
| H-11 | Dashboard page uses `requireCompanyAccessCached()` instead of redundant `auth.getUser()` | `app/(dashboard)/dashboard/page.tsx` |
| H-14 | Dynamic import for `xlsx` (~500KB saved from client bundle) | `app/(dashboard)/import/upload/page.tsx` |
| H-17 | Removed PDF exports from barrel file; direct import in server action | `lib/exports/index.ts`, `app/actions/exports.ts` |
| H-20 | Fixed `EmployeeCard` memo breakage from inline closure | `components/dashboard/compliance-table.tsx` |

### Batch 3 (2026-02-18 — phases 1-2 completion)

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| M-19 | Pre-partitioned `COUNTRY_LIST` at module level (3 filters → 0 per render) | `components/trips/country-select.tsx` |
| L-10 | Fixed `index` as key in GDPR consequence list — use `consequence` string | `components/gdpr/confirm-destructive-action.tsx` |
| H-13 | Migrated 5 server action files to `requireCompanyAccessCached()` | `app/(dashboard)/actions.ts`, `app/(dashboard)/gdpr/actions.ts`, `app/(dashboard)/import/actions.ts`, `lib/actions/settings.ts`, `lib/data/compliance-snapshots.ts` |

### Batch 4 (2026-02-18 — phase 3 bundle optimisation)

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| H-16 | Added `next/dynamic` for GanttChart, MobileCalendarView, QuickAddTripModal, DashboardTour, AddTripModal, BulkAddTripsModal; removed unused GDPR imports from server page | `components/calendar/calendar-view.tsx`, `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/compliance-table.tsx`, `app/(dashboard)/employee/[id]/page.tsx`, `app/(dashboard)/gdpr/page.tsx` |
| M-16 | Removed `Geist_Mono` font from root layout — saves a Google Font download on every page | `app/layout.tsx` |
| M-17 | Removed manual `<link rel="preload">` for logos from root layout — route layouts already use `<Image priority>` | `app/layout.tsx` |
| M-18 | Verified barrel files (`calendar/index.ts`, `trips/index.ts`) are unused — all consumers already use direct imports | No changes needed |

### Batch 5 (2026-02-18 — phase 4 React component performance)

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| H-19 | Pre-computed `DateMeta[]` once in `GanttChart` (`useMemo`) — eliminates O(employees x dates) `isToday`/`isWeekend`/`format` calls | `components/calendar/gantt-chart.tsx`, `components/calendar/employee-row.tsx` |
| M-24 | `DateHeader` now consumes pre-computed `DateMeta` — removes per-cell `isToday`/`isWeekend`/`format` in 2 render loops | `components/calendar/date-header.tsx` |
| M-20 | Wrapped `sortedTrips` in `useMemo`; replaced `new Date()` comparisons with ISO string comparison | `components/trips/trip-list.tsx` |
| M-21 | Wrapped `TripCardMobile` in `memo()` to prevent re-renders on modal toggle | `components/trips/trip-card-mobile.tsx` |
| M-22 | Wrapped `StatusFilters` and `FilterButton` in `memo()`; `filters` array in `useMemo` | `components/dashboard/status-filters.tsx` |
| M-23 | Extracted inline `onOpenChange` lambda to stable `handleAddTripOpenChange` `useCallback` | `components/dashboard/compliance-table.tsx` |

### Batch 6 (2026-02-18 — phase 5 database optimisation)

| Fix | Description | Files Changed |
|-----|-------------|---------------|
| H-09 | Added partial composite index `idx_alerts_employee_type_resolved` on `alerts(employee_id, alert_type, resolved) WHERE resolved = false` | `supabase/migrations/20260218123154_add_performance_indexes.sql` |
| H-10 | Already existed as `idx_trips_employee_date_range` — no change needed | N/A |
| M-09 | Enabled `pg_trgm` extension; added GIN trigram index `idx_employees_name_trgm` on `employees(name) WHERE deleted_at IS NULL` | `supabase/migrations/20260218123154_add_performance_indexes.sql` |
| M-10 | Added partial composite index `idx_trips_company_entry_date` on `trips(company_id, entry_date) WHERE ghosted = false` | `supabase/migrations/20260218123154_add_performance_indexes.sql` |
| M-05 | Added `.limit(500)` to `getTripsByEmployeeId` to prevent unbounded fetches | `lib/db/trips.ts` |
| M-06 | Added `.limit(100)` to `getAlertsByEmployeeId` to prevent unbounded fetches | `lib/db/alerts.ts` |
| M-07 | Created `getEmployeesForDropdown()` returning only `id, name` with `.limit(500)` for reassignment dropdown | `lib/db/employees.ts`, `app/(dashboard)/employee/[id]/page.tsx` |

---

## 9. Remaining Work Summary

**HIGH priority remaining (5 items):**

- H-02 — Move `profiles` query out of middleware (JWT metadata)
- H-03 — Replace `getEmployeeStats` with DB aggregate / `unstable_cache`
- H-06 — Move alert detection to background job
- H-07 — Batch GDPR retention cron queries (N+1)
- H-08 — Batch import inserter trip lookups (N+1)

**MEDIUM priority remaining (5 items):**

- M-01 through M-29 (minus completed M-05, M-06, M-07, M-09, M-10, M-16, M-17, M-18, M-19, M-20, M-21, M-22, M-23, M-24, M-25) — see Section 4 for details

**LOW priority remaining (8 items):**

- L-01 through L-11 (minus completed L-07, L-08, L-10) — see Section 5 for details

**To continue:** Open this file, scan the checkboxes in Section 6, and pick the next unchecked items to implement.

---

*End of report.*
