# ComplyEur Scalability & Resilience Audit Report

**Date:** 2026-01-17
**Auditor:** Claude Code
**Version:** 2.0

---

## Executive Summary

This audit identifies gaps that could cause failures at scale in the ComplyEur Next.js codebase. The focus areas are database queries, multi-tenant security, error handling, and observability.

**Overall Assessment:** The codebase has good foundational security with RLS policies and defense-in-depth patterns in critical paths. However, several scalability issues exist that will cause problems at 100+ companies or companies with 100+ employees.

### Risk Summary

| Category | Critical | Important | Nice-to-Have |
|----------|----------|-----------|--------------|
| Database & Queries | 3 | 5 | 2 |
| Security & Multi-Tenancy | 2 | 2 | 1 |
| Error Handling | 0 | 3 | 2 |
| Observability | 1 | 2 | 3 |
| **Total** | **6** | **12** | **8** |

---

## 1. CRITICAL Issues (Must Fix Before Launch)

### 1.1 [CRITICAL] Forecasts Module Missing Company Isolation

**Files:**
- `lib/db/forecasts.ts:43-53` - `getFutureTrips()`
- `lib/db/forecasts.ts:102-116` - `getAllTripsGroupedByEmployee()`
- `lib/db/forecasts.ts:153-156` - `getEmployeesForSelect()`

**Issue:** All three functions rely SOLELY on RLS for tenant isolation with NO explicit `company_id` filter. The queries select `*` without any company validation.

**Code Example (getFutureTrips):**
```typescript
// CURRENT - Missing company_id filter
const { data, error } = await supabase
  .from('trips')
  .select(`*, employee:employees!inner(name)`)
  .gte('entry_date', today)
  .eq('ghosted', false)
  .order('entry_date', { ascending: true })
```

**Risk:** If RLS is ever bypassed (misconfiguration, admin client leak, Supabase bug), this exposes ALL companies' future trips and employee data.

**Business Impact:** Data leak across tenants = GDPR violation, loss of customer trust, potential legal liability.

**Fix:** Add explicit `company_id` filter and `getAuthenticatedUserCompany()` pattern used elsewhere:
```typescript
const { companyId } = await getAuthenticatedUserCompany(supabase)
const { data, error } = await supabase
  .from('trips')
  .select(`*, employee:employees!inner(name)`)
  .eq('company_id', companyId)  // DEFENSE-IN-DEPTH
  .gte('entry_date', today)
  ...
```

---

### 1.2 [CRITICAL] Bulk Import Loads Entire Dataset Into Memory

**Files:**
- `lib/import/inserter.ts:98-101` - Fetches ALL employees
- `lib/import/inserter.ts:246-261` - Fetches ALL trips for company

**Issue:** The bulk import feature fetches the entire employee list and entire trip history to build in-memory lookup maps for duplicate detection.

**Code:**
```typescript
// Line 98-101: Fetches ALL employees (no pagination)
const { data: existingEmployees } = await supabase
  .from('employees')
  .select('id, name, email')
  .eq('company_id', companyId);

// Line 258-261: Fetches ALL trips (no pagination)
const { data: existingTrips } = await supabase
  .from('trips')
  .select('id, employee_id, entry_date, exit_date')
  .eq('company_id', companyId);
```

**Risk:** For a company with 500+ employees and 5,000+ trips:
- Memory exhaustion on serverless function
- Query timeout (Supabase has 30s limit)
- Slow imports (20+ seconds)

**Business Impact:** Import feature becomes unusable for larger customers.

**Fix:** Use database-side duplicate detection:
```sql
-- Alternative: Use ON CONFLICT DO NOTHING
INSERT INTO trips (...) VALUES (...)
ON CONFLICT (employee_id, entry_date, exit_date) DO NOTHING;
```

Or implement cursor-based pagination for large datasets.

---

### 1.3 [CRITICAL] Trip Overlap Detection Fetches All Trips

**Files:**
- `lib/db/trips.ts:134-138` - `createTrip()` overlap check
- `lib/db/trips.ts:209-213` - `updateTrip()` overlap check
- `lib/db/trips.ts:392-395` - `createBulkTrips()` overlap check

**Issue:** Every trip creation fetches ALL existing trips for the employee to check for date overlaps. No pagination or date filtering.

**Code:**
```typescript
// Line 134-138: Fetches ALL trips for employee
const { data: existingTrips, error: tripsError } = await supabase
  .from('trips')
  .select('id, entry_date, exit_date')
  .eq('employee_id', trip.employee_id)
```

**Risk:** Employee with 500+ historical trips = slow trip creation (3-5s per trip).

**Business Impact:** Poor UX for power users; compliance calculation errors during timeouts.

**Fix:** Add date range filter to only fetch relevant trips:
```typescript
const { data: existingTrips } = await supabase
  .from('trips')
  .select('id, entry_date, exit_date')
  .eq('employee_id', trip.employee_id)
  // Only check trips that could possibly overlap (within 180-day window)
  .gte('exit_date', trip.entry_date)
  .lte('entry_date', trip.exit_date)
```

Or implement overlap checking at database level with a constraint/trigger.

---

### 1.4 [CRITICAL] Employees DB Layer Missing Company Ownership Validation

**Files:**
- `lib/db/employees.ts:11-14` - `getEmployees()`
- `lib/db/employees.ts:85-93` - `updateEmployee()`
- `lib/db/employees.ts:110-116` - `deleteEmployee()`

**Issue:** Unlike `lib/db/trips.ts` which uses `getAuthenticatedUserCompany()` for defense-in-depth, the employees module relies SOLELY on RLS policies.

**Code (updateEmployee):**
```typescript
// CURRENT - No company_id validation
export async function updateEmployee(id: string, updates: EmployeeUpdate): Promise<Employee> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)  // Only filters by ID, relies on RLS
    .select()
    .single()
```

**Risk:** If a user obtains another company's employee ID and RLS fails, they could update/delete that employee.

**Business Impact:** Data integrity violation; compliance data corruption.

**Fix:** Follow the `trips.ts` pattern with explicit ownership check:
```typescript
const { companyId } = await getAuthenticatedUserCompany(supabase)
// Verify employee belongs to user's company BEFORE modifying
const { data: employee } = await supabase
  .from('employees')
  .select('company_id')
  .eq('id', id)
  .single()

if (!employee || employee.company_id !== companyId) {
  throw new NotFoundError('Employee not found')
}
```

---

### 1.5 [CRITICAL] Notification Recipients Query Assumes Max 1000 Users

**File:** `lib/db/alerts.ts:591-593`

**Issue:** The `getNotificationRecipients()` function uses `listUsers({ perPage: 1000 })` which will fail or miss users if a company exceeds 1000 team members.

**Code:**
```typescript
const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
  perPage: 1000, // Should be enough for most companies
})
```

**Risk:** Large enterprise customers won't receive email notifications for critical compliance alerts.

**Business Impact:** Missed compliance warnings = potential €5,000+ fines for customers.

**Fix:** Implement pagination or batch processing:
```typescript
let allUsers: User[] = []
let page = 1
let hasMore = true
while (hasMore) {
  const { data } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
  allUsers.push(...data.users)
  hasMore = data.users.length === 1000
  page++
}
```

---

### 1.6 [CRITICAL] Performance Metrics Lost on Restart

**File:** `lib/performance/instrumentation.ts:26-37`

**Issue:** All performance metrics are stored in an in-memory buffer that is lost on every serverless function cold start or restart.

**Code:**
```typescript
/** In-memory metrics buffer (for development/debugging) */
const metricsBuffer: PerformanceMetric[] = []
const MAX_METRICS_BUFFER = 100
```

**Risk:** No visibility into production performance issues; can't identify slow queries or degradation patterns.

**Business Impact:** Performance issues go undetected until they cause customer complaints or outages.

**Fix:** Integrate with external monitoring:
- Sentry Performance Monitoring
- Vercel Analytics
- DataDog / New Relic
- Or send metrics to Redis/external store

---

## 2. IMPORTANT Issues (Fix Before Scaling to 100+ Users)

### 2.1 [IMPORTANT] No Pagination on Employee Listing

**Files:**
- `lib/db/employees.ts:11-21` - `getEmployees()`
- `lib/data/employees.ts:60-89` - `getEmployeesWithTrips()`

**Issue:** Both functions return ALL employees without pagination.

**Risk:** Dashboard becomes slow with 100+ employees; eventually times out.

**Fix:** Add cursor-based pagination:
```typescript
export async function getEmployees(options?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = options ?? {}
  const { data } = await supabase
    .from('employees')
    .select('*')
    .order('name')
    .range(offset, offset + limit - 1)
  return data
}
```

---

### 2.2 [IMPORTANT] No Pagination on Alert Queries

**Files:**
- `lib/db/alerts.ts:55-75` - `getActiveAlerts()`
- `lib/db/alerts.ts:80-101` - `getUnacknowledgedAlerts()`
- `lib/db/alerts.ts:106-133` - `getAlertsByEmployeeId()`

**Issue:** All alert queries return complete datasets without pagination.

**Risk:** Company with 50+ employees approaching limits could have 100+ active alerts, slowing dashboard.

**Fix:** Add `.limit()` and pagination options.

---

### 2.3 [IMPORTANT] Read-Then-Update Race Condition

**File:** `app/(dashboard)/import/actions.ts:687-717` - `incrementMappingUsage()`

**Issue:** Uses read-then-update pattern instead of atomic increment.

**Code:**
```typescript
const { data: current } = await supabase
  .from('column_mappings')
  .select('times_used')
  .eq('id', mappingId)
  .single()

const currentTimesUsed = current?.times_used ?? 0

await supabase
  .from('column_mappings')
  .update({
    times_used: currentTimesUsed + 1,  // RACE CONDITION: Another request could increment between read and update
  })
```

**Risk:** Concurrent imports could lose increment counts.

**Fix:** Use SQL atomic increment:
```typescript
await supabase.rpc('increment_mapping_usage', { mapping_id: mappingId })

-- PostgreSQL function:
CREATE FUNCTION increment_mapping_usage(mapping_id UUID)
RETURNS void AS $$
  UPDATE column_mappings
  SET times_used = times_used + 1, last_used_at = NOW()
  WHERE id = mapping_id;
$$ LANGUAGE SQL;
```

---

### 2.4 [IMPORTANT] No Retry Logic on Network Failures

**Files:** All files in `lib/db/` and `app/**/actions.ts`

**Issue:** No retry logic when Supabase requests fail due to network issues. Single failure = user error.

**Current Pattern:**
```typescript
const { data, error } = await supabase.from('employees').select('*')
if (error) {
  throw new DatabaseError('Failed to fetch employees')  // No retry
}
```

**Risk:** Transient network issues cause unnecessary failures for users.

**Fix:** Implement retry wrapper:
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (!isRetryableError(error) || i === maxRetries - 1) throw error
      await sleep(Math.pow(2, i) * 1000)  // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded')
}
```

---

### 2.5 [IMPORTANT] Server Actions Don't Use Rate Limiting Helper

**Files:** All files in `app/(dashboard)/actions.ts`, `app/(dashboard)/gdpr/actions.ts`, `app/actions/exports.ts`

**Issue:** The `checkServerActionRateLimit()` helper exists in `lib/rate-limit.ts` but is not used by any Server Actions.

**Risk:** Users can spam expensive operations (exports, imports, bulk updates) without throttling.

**Fix:** Add rate limiting to expensive operations:
```typescript
export async function exportComplianceData(options: ExportOptions) {
  const { user } = await supabase.auth.getUser()
  const { allowed, error } = await checkServerActionRateLimit(user.id, 'exportComplianceData')
  if (!allowed) {
    return { success: false, error }
  }
  // ... rest of function
}
```

---

### 2.6 [IMPORTANT] Import Session Update Missing Company Verification

**File:** `app/(dashboard)/import/actions.ts:343-376` - `updateSessionStatus()`

**Issue:** Updates import session without verifying the session belongs to the current user's company.

**Code:**
```typescript
export async function updateSessionStatus(
  sessionId: string,
  status: ImportStatus,
  additionalData?: Partial<ImportSession>
): Promise<boolean> {
  // NO company_id validation here - relies on RLS only
  const { error } = await supabase
    .from('import_sessions')
    .update(updateData)
    .eq('id', sessionId)  // Only filters by ID
```

**Risk:** If user obtains another company's session ID, they could potentially update its status.

**Fix:** Add explicit company_id check like in `getImportSession()`.

---

### 2.7 [IMPORTANT] Missing Index on notification_log.company_id

**File:** Supabase migrations

**Issue:** The `notification_log` table is queried by `company_id` but no index exists.

**Current Indexes (from `20260109000003_performance_indexes.sql`):**
- idx_employees_company_id
- idx_trips_company_id
- idx_alerts_company_unresolved
- NO idx_notification_log_company_id

**Fix:** Add migration:
```sql
CREATE INDEX IF NOT EXISTS idx_notification_log_company_id
  ON notification_log(company_id);
```

---

## 3. NICE-TO-HAVE Improvements

### 3.1 [NICE-TO-HAVE] Transaction Support for Multi-Step Operations

**Files:**
- `app/actions/exports.ts` - Export + audit log
- `lib/import/inserter.ts` - Insert + audit log
- `lib/db/alerts.ts` - Create alert + update status

**Issue:** Multi-step database operations don't use transactions, so partial failures can leave data inconsistent.

**Current:**
```typescript
// If audit log insert fails after successful export, no rollback
const result = await generateExport(...)
await logExport(...)  // Could fail
```

**Improvement:** Use Supabase transactions when available:
```typescript
const { error } = await supabase.rpc('export_with_audit', { ... })
```

---

### 3.2 [NICE-TO-HAVE] Structured Logging

**Files:** All files using `console.error()`, `console.warn()`

**Issue:** Logging uses unstructured console statements that are hard to search and analyze.

**Current:**
```typescript
console.error('Error fetching employees:', error)
console.warn('[Retention Cron] Running without CRON_SECRET')
```

**Improvement:** Use structured logging library (Pino, Winston):
```typescript
logger.error({ error, context: 'getEmployees', companyId }, 'Failed to fetch employees')
```

---

### 3.3 [NICE-TO-HAVE] Database Connection Pooling Monitoring

**Issue:** No visibility into Supabase connection pool usage.

**Improvement:** Add connection pool metrics to performance instrumentation.

---

## 4. Security Findings Summary

### 4.1 RLS Policies: Status

| Table | RLS Enabled | Policies Exist | Company Isolation |
|-------|-------------|----------------|-------------------|
| employees | Yes | Yes | Yes |
| trips | Yes | Yes | Yes |
| alerts | Yes | Yes | Yes |
| company_settings | Yes | Yes | Yes |
| audit_log | Yes | Yes | Yes |
| profiles | Yes | Yes | Yes |
| import_sessions | Yes | Yes | Yes |
| column_mappings | Yes | Yes | Yes |
| tiers | Yes | Yes (read-only) | N/A (public) |
| company_entitlements | Yes | Yes | Yes |
| company_notes | Yes | Deny-all | Admin-only |
| admin_audit_log | Yes | Deny-all | Admin-only |

**Assessment:** RLS is properly enabled on all tables. The recent security migration (`20260117_security_tenant_isolation.sql`) added proper deny policies and soft-delete filtering.

### 4.2 Server Actions: Company Validation Summary

| Action File | Total Actions | With Company Check | RLS-Only |
|-------------|--------------|-------------------|----------|
| app/(dashboard)/actions.ts | 15 | 0 (delegates to lib/db) | 15 |
| app/(dashboard)/import/actions.ts | 10 | 2 | 8 |
| app/(dashboard)/gdpr/actions.ts | ~5 | Yes | 0 |
| app/actions/exports.ts | 3 | Yes | 0 |
| lib/actions/security.ts | 1 | Yes | 0 |

**Note:** Dashboard actions delegate to `lib/db/` functions. The trips module has proper defense-in-depth; the employees module relies on RLS only.

---

## 5. Observability Findings

### 5.1 Current State

| Feature | Implemented | Location |
|---------|------------|----------|
| Error Logging | console.error only | Throughout codebase |
| Performance Timing | Yes (in-memory) | lib/performance/instrumentation.ts |
| Cache Hit Tracking | Yes (in-memory) | lib/performance/instrumentation.ts |
| Rate Limiting Metrics | Yes (Upstash analytics) | lib/rate-limit.ts |
| Audit Logging | Yes (database) | lib/admin/audit.ts, throughout |
| External APM | No | N/A |

### 5.2 Gaps

1. **No External Error Reporting:** Errors logged to console are lost in serverless environments
2. **No Alerting:** No alerts when error rates spike or performance degrades
3. **No Distributed Tracing:** Can't trace request across functions
4. **In-Memory Metrics:** Lost on restart

---

## 6. Error Handling Assessment

### 6.1 Strengths

- **Custom Error Classes:** Well-defined hierarchy (`AuthError`, `DatabaseError`, `ValidationError`, `NotFoundError`)
- **Error Mapping:** Supabase errors mapped to user-friendly messages (`lib/errors/index.ts`)
- **Zod Validation:** All inputs validated with proper error extraction

### 6.2 Weaknesses

1. **No Retry Logic:** Network failures aren't retried
2. **Generic Catch-All:** Some functions return generic "Something went wrong" without context
3. **Swallowed Errors:** Some fire-and-forget operations (alert detection) swallow errors silently

```typescript
// Example of swallowed error (app/(dashboard)/actions.ts:55-58)
runAlertDetection(employeeId).catch((error) => {
  console.error('[AlertDetection] Unexpected error:', error)  // Logged but not surfaced
})
```

---

## 7. Recommendations Priority Matrix

### Immediate (Before Launch)

1. Add company_id validation to `lib/db/forecasts.ts`
2. Add company_id validation to `lib/db/employees.ts` mutations
3. Add date range filter to trip overlap detection
4. Fix notification recipients 1000 user limit

### Short-term (Before 100 Users)

1. Implement pagination for employees and alerts
2. Add retry logic with exponential backoff
3. Use atomic increments instead of read-then-update
4. Add rate limiting to Server Actions

### Medium-term (Before 1000 Users)

1. Integrate external APM (Sentry, Vercel Analytics)
2. Implement structured logging
3. Add database-side duplicate detection for imports
4. Optimize bulk import for large datasets

---

## 8. Testing Recommendations

### Load Testing Scenarios

1. **Company with 100 employees, 1000 trips:** Verify dashboard loads < 2s
2. **Simultaneous trip creation:** Test overlap detection under load
3. **Bulk import of 500 rows:** Verify no timeout
4. **Alert notification to 50 users:** Verify all receive emails

### Security Testing

1. Attempt to access another company's data via API
2. Test RLS with direct Supabase queries
3. Verify rate limiting blocks abuse

---

## Appendix A: Files Requiring Changes

### Critical Priority

| File | Line(s) | Issue |
|------|---------|-------|
| lib/db/forecasts.ts | 43-53, 102-116, 153-156 | Missing company_id filter |
| lib/db/employees.ts | 85-93, 110-116 | Missing company ownership check |
| lib/db/trips.ts | 134-138, 209-213, 392-395 | No date range on overlap check |
| lib/db/alerts.ts | 591-593 | 1000 user limit |
| lib/import/inserter.ts | 98-101, 246-261 | Fetches all data |
| lib/performance/instrumentation.ts | 26-37 | In-memory metrics |

### Important Priority

| File | Line(s) | Issue |
|------|---------|-------|
| lib/db/employees.ts | 11-21 | No pagination |
| lib/data/employees.ts | 60-89 | No pagination |
| lib/db/alerts.ts | 55-75, 80-101, 106-133 | No pagination |
| app/(dashboard)/import/actions.ts | 343-376, 687-717 | Missing validation, race condition |

---

## Appendix B: Existing Security Mitigations

The codebase includes several security features:

1. **RLS on all tables** - Database-level tenant isolation
2. **Defense-in-depth in trips.ts** - Double-checks company ownership
3. **Rate limiting** - Upstash Redis for distributed rate limiting
4. **Input validation** - Zod schemas on all Server Actions
5. **CSV injection prevention** - Export sanitization
6. **GDPR compliance** - Soft delete, retention policies, DSAR support
7. **Admin audit logging** - All admin actions logged

---

*End of Audit Report*
