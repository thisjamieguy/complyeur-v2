# Phase 7 Handover — Cache Consistency Fixes

**Date:** 2026-02-18
**Context:** Performance audit re-audit (Section 11 in `memory/PERFORMANCE-AUDIT.md`) identified 28 new issues. Phase 7 migrates remaining uncached auth patterns to `requireCompanyAccessCached()`.

---

## What's Done

### Verification Protocol (Section 7) — COMPLETE
- `npm run typecheck` — PASS
- `npm run test` — 964 passed, 16 skipped
- `npm run build` — PASS
- Re-audit by 4 parallel agents — 53/53 previous fixes verified, 0 regressions

### Re-Audit Report — COMPLETE
- Section 11 added to `memory/PERFORMANCE-AUDIT.md`
- 28 new issues documented (0H, 11M, 17L)
- Phases 7-10 with implementation checklists added

### Phase 7 Progress — IN PROGRESS (1 of 6 done)

- [x] **N-08** — `bulkAddTripsAction` in `app/(dashboard)/actions.ts:232-247`
  - Replaced raw `getUser()` + profiles query with `requireCompanyAccessCached()`
  - Uses `ctx.userId`, `ctx.role` from cached context
  - MFA call passes `userId` only (function fetches email internally via fallback)
  - **File is saved but NOT committed**

---

## What's Left in Phase 7

### N-09: `getImportSession` — `app/(dashboard)/import/actions.ts:221-256`
**Current:** Direct `profiles.select('company_id').single()` query (line 228-231).
**Fix:** Replace with `const { companyId } = await requireCompanyAccessCached()`. Already imported at line 9.
**Note:** The function uses `companyId` for the explicit company_id filter on `import_sessions` (line 243). After getting `companyId` from cached context, the rest of the function stays the same.

### N-10: Three functions in `app/(dashboard)/import/actions.ts`

1. **`executeImport`** (line 457-534)
   - **Current:** `getUser()` (line 464-467) → `profiles.select('role')` (line 509-513) → `requireCompanyAccess(supabase, session.company_id)` (line 562)
   - **Fix:** Replace opening auth block with `const ctx = await requireCompanyAccessCached()`. Use `ctx.userId` for rate limit, `ctx.role` for permission check. Keep the `requireCompanyAccess(supabase, session.company_id)` call on line 562 — it validates the session belongs to the user's company (different purpose).
   - **MFA:** Same pattern as N-08 — pass `ctx.userId` only, MFA function fetches email internally.

2. **`loadSavedMappings`** (line 723-759)
   - **Current:** `getUser()` (line 731-733) only used for auth check, not for any field values.
   - **Fix:** Replace with `await requireCompanyAccessCached()` (just for auth validation). The function relies on RLS, so no `companyId` needed. Can discard the return value: `await requireCompanyAccessCached()`.

3. **`saveColumnMapping`** (line 771-841)
   - **Current:** `getUser()` (line 794-797) → `profiles.select('company_id')` (line 803-807) → `requireCompanyAccess(supabase, profile.company_id)` (line 814)
   - **Fix:** Replace all three with `const { userId, companyId } = await requireCompanyAccessCached()`. Use `userId` for `created_by` field (line 822) and `companyId` for `company_id` field (line 820).
   - **Also migrate:** `deleteColumnMapping` (line 849) and `incrementMappingUsage` (line 891) use the pattern `fetch → requireCompanyAccess(supabase, row.company_id)` which is a legitimate ownership check (verifying the specific row belongs to the company). These can stay as-is OR switch to `requireCompanyAccessCached()` for the auth part with a simpler RLS-based ownership check.

### N-23: Alert CRUD — `lib/db/alerts.ts`

**Current:** `getAuthenticatedUserCompany(supabase)` (line 28-33) calls uncached `requireCompanyAccess(supabase)`. Every alert function creates its own `supabase` client and calls this.

**Fix:** Refactor `getAuthenticatedUserCompany` to use the cached variant:
```typescript
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'

async function getAuthenticatedUserCompany(): Promise<AuthContext> {
  const { userId, companyId } = await requireCompanyAccessCached()
  return { userId, companyId }
}
```

**Impact:** All alert CRUD functions (`getActiveAlerts`, `getUnacknowledgedAlerts`, `getAlertsByEmployeeId`, `hasActiveAlertOfType`, `createAlert`, `acknowledgeAlert`, `resolveAlert`, `resolveAlertsForEmployee`) will automatically use the cached path.

**Subtlety:** These functions also create their own `supabase` client (e.g., `const supabase = await createClient()` at line 43) which they still need for the actual DB queries. Only the auth/profile resolution becomes cached.

**Exception:** `markAlertEmailSent` (line 295-318) uses a different pattern — it fetches the alert first, then calls `requireCompanyAccess(supabase, existing.company_id)` to verify ownership. This is a legitimate pattern and should stay.

### N-06: Dashboard tour profiles query — `app/(dashboard)/dashboard/page.tsx:119-123`

**Current:** After `requireCompanyAccessCached()` returns `userId`, a separate uncached `profiles.select('dashboard_tour_completed_at')` query runs.

**Fix options (pick one):**
1. **Extend `CompanyAccessContext`** to include `dashboardTourCompletedAt` — broadest change, affects the shared type
2. **Add field to layout's existing profiles query** — the dashboard layout at `app/(dashboard)/layout.tsx` already queries profiles; add the field there and pass down
3. **Create a separate cached fetcher** just for tour state — simplest, minimal blast radius

**Recommended:** Option 3 — create a `cache()`-wrapped function in a shared location:
```typescript
// In lib/db/profiles.ts or similar
export const getDashboardTourState = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('dashboard_tour_completed_at')
    .eq('id', userId)
    .single()
  return data?.dashboard_tour_completed_at ?? null
})
```

### N-07: Settings page Stripe waterfall — `app/(dashboard)/settings/page.tsx:97-127`

**Current:** After `Promise.all` completes, there's a serial waterfall: `getUser()` → `profiles.select('company_id')` → `companies.select('stripe_customer_id')`.

**Fix:**
1. Import `requireCompanyAccessCached` at top
2. Replace the serial block (lines 97-127) with:
```typescript
if (activeSection === 'general') {
  const { companyId } = await requireCompanyAccessCached()

  const [settingsResult, prefsResult, entitlementsResult, companyResult] = await Promise.all([
    getCompanySettings(),
    getUserPreferencesWithFallback(),
    getCompanyEntitlements(),
    createClient().then(s => s.from('companies').select('stripe_customer_id').eq('id', companyId).single()),
  ])
  settings = settingsResult
  userPreferences = prefsResult
  entitlements = entitlementsResult
  hasStripeCustomer = !!companyResult.data?.stripe_customer_id
}
```

---

## Key Pattern Reference

### `requireCompanyAccessCached()` — `lib/security/tenant-access.ts:69-77`
- Wrapped in `React.cache()` — deduplicated per server request
- Creates its own Supabase client internally
- Returns `{ userId, companyId, role, isSuperadmin }`
- Does NOT return `userEmail` — functions needing email should let MFA fetch it internally

### `enforceMfaForPrivilegedUser` — `lib/security/mfa.ts:64-93`
- Takes optional `userEmail` — if not passed, fetches from `supabase.auth.getUser()` internally
- Safe to pass `undefined` for email

---

## Test Commands After All Changes
```bash
npm run typecheck    # Must pass clean
npm run test         # Expect 964 passed, 16 skipped
npm run build        # Must succeed
```

## Files Modified So Far (uncommitted)
- `app/(dashboard)/actions.ts` — N-08 applied
- `memory/PERFORMANCE-AUDIT.md` — Section 11 re-audit results added

## Files To Modify
- `app/(dashboard)/import/actions.ts` — N-09, N-10
- `lib/db/alerts.ts` — N-23
- `app/(dashboard)/dashboard/page.tsx` — N-06
- `app/(dashboard)/settings/page.tsx` — N-07
