# ComplyEUR Pre-Launch Security Audit Report

**Audit Date:** 2026-02-07
**Auditor:** Claude Opus 4.6 (Automated Static Analysis)
**Scope:** Full codebase at `/home/user/complyeur-v2` -- 345+ files across 60 directories
**Codebase:** Next.js 16 (App Router), TypeScript, Supabase PostgreSQL with RLS, Tailwind + Shadcn/UI

---

## Summary Verdict

### LAUNCH WITH CAUTION

The application has a strong security foundation -- RLS on all 23 tables, a well-designed tenant isolation gate (`requireCompanyAccess`), comprehensive GDPR implementation, and proper secret management. However, **7 blockers** must be resolved before production launch:

1. **SheetJS `xlsx` package has 2 HIGH CVEs** (Prototype Pollution + ReDoS) and is abandoned on npm -- directly exploitable via the import pipeline
2. **Next.js 16.1.1 has an HTTP Deserialization DoS CVE** (CVE-2026-23864) affecting all server actions
3. **15 dashboard server actions lack role-based permission checks** -- any authenticated user (including `viewer` role) can perform destructive mutations
4. **Test endpoints page and test email route deployed to production** -- publicly accessible debug surfaces
5. **Read-path data layer functions lack defense-in-depth** -- `lib/data/employees.ts` and `lib/db/forecasts.ts` have zero auth/company filtering, relying solely on RLS
6. **16+ client components display raw `error.message` in toast notifications** -- potential database structure leakage
7. **Inactive session timeout completely disabled** -- sessions persist indefinitely through refresh token rotation

---

## AUDIT 1: Multi-Tenancy & Data Isolation

**Severity: CRITICAL | Status: PARTIAL | Issues Found: 7**

### What Works Well

- RLS is enabled on all 23 tables with appropriate policies
- `requireCompanyAccess()` (`lib/security/tenant-access.ts:20-53`) is well-designed: authenticates user, derives `company_id` from profile, validates against target
- All write operations (INSERT, UPDATE, DELETE) consistently derive `company_id` from the authenticated session, never from client input
- Bulk delete operations (`lib/actions/bulk-delete.ts:309-360`) use `.eq('company_id', ...)` alongside `.in('id', ...)` -- gold standard for bulk operations
- `rls_auto_enable()` event trigger automatically enables RLS on new tables
- `prevent_restricted_profile_updates()` trigger blocks non-service-role users from changing `role`, `company_id`, or `is_superadmin`
- All `SECURITY DEFINER` functions use `SET search_path TO ''` (with two minor exceptions noted in Audit 12)

### Findings

**F1-1 [HIGH]: `lib/db/forecasts.ts` -- Entire file lacks authentication and company_id filtering**
- Affected functions: `getFutureTrips` (line 36), `getAllTripsForEmployee` (line 73), `getAllTripsGroupedByEmployee` (line 96), `getEmployeesForSelect` (line 150)
- No call to `requireCompanyAccess`, no `supabase.auth.getUser()`, no `.eq('company_id', ...)` on any query
- Risk: If called from a service_role context (API route, cron job, future refactor), ALL companies' data would be returned

**F1-2 [HIGH]: `lib/data/employees.ts` -- All 6 exported functions lack authentication and company_id filtering**
- Affected: `getEmployeesWithTrips` (line 88), `getEmployeeComplianceData` (line 127), `getEmployeeComplianceDataPaginated` (line 198), `getEmployeeStats` (line 314), `getEmployeeById` (line 409), `getEmployeeCount` (line 454)
- `getEmployeeById` takes an `id` from URL path parameter with no ownership check
- Risk: Same as F1-1 -- single layer of defense (RLS only)

**F1-3 [HIGH]: `lib/data/compliance-snapshots.ts:55` -- `getEmployeesWithSnapshots` lacks auth and company filtering**
- Queries all non-deleted employees with trips, no auth, no company filter

**F1-4 [MEDIUM]: `lib/db/employees.ts:9,139` -- `getEmployees` and `getEmployeeCount` lack application-level company filtering**
- Write operations in same file are properly secured with `requireCompanyAccess`

**F1-5 [MEDIUM]: `app/(dashboard)/import/actions.ts` -- `getRecentImportSessions` and `getImportSessionsPaginated` lack explicit company_id filter**
- Auth check present, but `.eq('company_id', ...)` missing from query

**F1-6 [MEDIUM]: `lib/db/companies.ts:9,32` -- `getCompanyById` and `getCompanyBySlug` accept arbitrary parameters with no auth**
- Not directly exposed as server actions; RLS provides protection

**F1-7 [INFO]: `lib/security/__tests__/tenant-isolation.test.ts` -- All 14 test cases are `describe.skip()` with placeholder assertions**
- Zero automated regression testing for tenant isolation

---

## AUDIT 2: Authentication & Authorization

**Severity: CRITICAL | Status: FAIL | Issues Found: 5**

### What Works Well

- Middleware enforces authentication on all protected routes (`middleware.ts:45-62`)
- Admin panel consistently gated by `requireSuperAdmin()` (24 callsites across 12 files)
- MFA enforcement for privileged roles via `enforceMfaIfPrivileged()` (`lib/security/authorization.ts:52-68`)
- Open redirect protection via `validateRedirectUrl()` (`lib/utils/redirect.ts`)
- Login returns "Invalid email or password" -- prevents user enumeration (`lib/errors.ts:85-86`)
- Orphaned auth accounts handled -- middleware signs out users with no profile/company (`lib/supabase/middleware.ts:58-64`)

### Findings

**F2-1 [CRITICAL]: 15 dashboard server actions missing role-based permission checks (`app/(dashboard)/actions.ts`)**
- Actions like `addEmployeeAction`, `deleteEmployeeAction`, `addTripAction`, `deleteTripAction`, `updateCompanySettingsAction` etc. delegate to `requireCompanyAccess()` which only verifies company membership, not role
- A `viewer` role user (intended for read-only) can call destructive mutations via direct POST to server action endpoints
- The permission system exists (`lib/permissions.ts`) but these 15 actions do not use it
- Contrast: `bulkAddTripsAction`, `exportComplianceData`, and all team management actions correctly check permissions

**F2-2 [HIGH]: GDPR destructive actions missing auth at action level (`app/(dashboard)/gdpr/actions.ts`)**
- `deleteEmployeeGdpr` (line 190), `restoreEmployeeGdpr` (line 228), `anonymizeEmployeeGdpr` (line 270) have no auth check in the action itself
- Contrast: `getEmployeesForGdpr` and `getGdprAuditLogAction` in same file properly check `isOwnerOrAdmin(profile.role)`

**F2-3 [HIGH]: DSAR API route has no authentication at route level (`app/api/gdpr/dsar/[employeeId]/route.ts:25-73`)**
- Calls `generateDsarExport(employeeId)` directly without authenticating the request
- Downstream function does check auth, but route itself has no rate limiting, no input validation
- All `/api/` routes treated as public by middleware (line 39)

**F2-4 [MEDIUM]: Session timeout enforcement disabled (`lib/supabase/middleware.ts:67-91`)**
- Entire session timeout block commented out: "last_activity_at column not yet deployed"
- Supabase-level timeouts also commented out (`supabase/config.toml:248-253`)
- Sessions persist indefinitely through refresh token rotation

**F2-5 [MEDIUM]: `transfer_company_ownership` RPC does not verify caller is current owner**
- Function at `supabase/migrations/20260206143000_owner_roles_and_team_invites.sql:281-333` accepts `p_current_owner_id` as parameter without checking `auth.uid()`
- Any authenticated user who knows the UUIDs could call this via Supabase RPC

---

## AUDIT 3: Server Action & API Security

**Severity: CRITICAL | Status: PARTIAL | Issues Found: 8**

### What Works Well

- Service role key isolated to `lib/supabase/admin.ts` -- never in frontend code
- CRON endpoint fail-closed authentication (`lib/security/cron-auth.ts`)
- Rate limiting architecture: three layers (middleware, Supabase auth, server actions)
- Zod validation schemas exist for all major data types
- Admin actions consistently require `requireSuperAdmin()` + Zod input validation + audit logging

### Findings

**F3-1 [CRITICAL]: No rate limiting on 11 destructive dashboard actions (`app/(dashboard)/actions.ts`)**
- `addEmployeeAction`, `deleteEmployeeAction`, `addTripAction`, `deleteTripAction`, `updateCompanySettingsAction` etc. have no `checkServerActionRateLimit()`
- Contrast: `bulkAddTripsAction` (line 220) and `submitFeedbackAction` (line 113) do have rate limiting

**F3-2 [CRITICAL]: Timing-attack vulnerability in CRON constant-time comparison (`lib/security/cron-auth.ts:172-187`)**
- Line 177: `result |= a.charCodeAt(i) ^ a.charCodeAt(i)` -- compares `a` against ITSELF (should be `b`)
- Function returns early on length mismatch, leaking the `CRON_SECRET` length via timing
- Should use `crypto.timingSafeEqual()` instead

**F3-3 [HIGH]: Turnstile CAPTCHA bypassable (`app/(preview)/landing/actions.ts:17-66`)**
- Three bypass paths: missing env var returns success, missing token returns success, API error returns success
- Bots can submit waitlist form without any CAPTCHA token

**F3-4 [HIGH]: Test email route publicly accessible (`app/api/test-email/route.ts`)**
- Marked "TEMPORARY - Delete after testing"
- No authentication, accepts `company` query parameter injected into HTML response
- Reflected XSS potential via `text/html` Content-Type

**F3-5 [MEDIUM]: Settings update writes raw input not validated data (`lib/actions/settings.ts:156-162`)**
- Zod validates `merged` object but database write spreads `...input` (original, unvalidated)
- Extra fields in input would pass through to database

**F3-6 [MEDIUM]: Admin client exposed via boolean parameter (`app/(dashboard)/import/actions.ts:118-131`)**
- `checkBulkImportEntitlement(companyId, useAdminClient: boolean)` -- dangerous pattern that could be misused

**F3-7 [HIGH]: 3 admin actions missing Zod input validation (`app/admin/companies/[id]/actions.ts`)**
- `changeTier` (line 80), `convertTrial` (line 191), `restoreCompany` (line 264) don't validate `companyId` as UUID
- Protected by `requireSuperAdmin()` but violates defense-in-depth

**F3-8 [LOW]: IP-based rate limiting spoofable via `x-forwarded-for` (`lib/rate-limit.ts:77-83`)**
- Safe on Vercel (header set by platform), but vulnerable if deployed elsewhere

---

## AUDIT 4: Input Validation & Sanitisation

**Severity: HIGH | Status: PARTIAL | Issues Found: 4**

### What Works Well

- Comprehensive Zod validation across 11 schema files
- CSV injection prevention on both import and export paths with 30+ test cases
- Country code validation with 300+ aliases supporting multiple languages
- UUID validation on all entity ID fields
- Import row limits (500 standard, 5000 Gantt) prevent resource exhaustion
- `sanitizeCsvValue()` covers all OWASP-recommended dangerous characters: `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`

### Findings

**F4-1 [MEDIUM]: Native `new Date()` used extensively in validation layer instead of `date-fns`**
- `lib/validations/trip.ts` (14 instances), `lib/validations/dates.ts` (8 instances), `lib/validations/trip-overlap.ts` (4 instances), `lib/validations/exports.ts` (2 instances)
- Project's own CLAUDE.md identifies this as HIGH PRIORITY -- timezone issues can cause off-by-one errors in the core 90/180-day compliance calculation
- Contrast: import pipeline at `lib/import/validator.ts` correctly uses `parseISO` from `date-fns`

**F4-2 [MEDIUM]: Free-text fields accept arbitrary content without HTML character restriction**
- `trip.purpose` (500 chars), `trip.job_ref` (100 chars), `admin.override_notes` (500 chars), `admin.note_content` (2000 chars), `feedback.message` (2000 chars), `gdpr.reason` (500 chars)
- Currently safe due to React JSX auto-escaping, but risk materializes if data rendered in emails, PDFs, or non-React contexts

**F4-3 [LOW]: No maximum password length (`lib/validations/auth.ts:14-29`)**
- `passwordSchema` enforces min 8 + complexity but no `.max()` -- potential DoS via multi-megabyte password strings

**F4-4 [INFO]: No `dangerouslySetInnerHTML` with user input**
- Two instances found -- both use only static/hardcoded content (JSON-LD schemas in `app/layout.tsx:59` and `app/(public)/faq/page.tsx:408`)

---

## AUDIT 5: Environment Variables & Secrets

**Severity: CRITICAL | Status: PASS | Issues Found: 2**

### What Works Well

- `.env*` pattern in `.gitignore` (line 34) covers all variants -- zero env files committed
- Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, and `NEXT_PUBLIC_MAINTENANCE_MODE` use the `NEXT_PUBLIC_` prefix -- all non-sensitive
- `SUPABASE_SERVICE_ROLE_KEY` never has `NEXT_PUBLIC_` prefix, only used in server-side files
- Startup validation in `lib/env.ts` enforces required vars and HTTPS URL format
- Admin settings page (`app/admin/settings/page.tsx:101`) only checks boolean presence of service role key, never renders the value
- No actual secrets found hardcoded in source files
- Sentry session replays mask all text and block all media (`sentry.client.config.ts:26-30`)
- Source maps hidden from client bundles (`next.config.ts:103`)

### Findings

**F5-1 [LOW]: No `.env.example` file exists**
- The `.gitignore` pattern `.env*` also blocks `.env.example` from being committed
- Environment documentation exists in CLAUDE.md and README but a template file is standard practice

**F5-2 [LOW]: Test script has hardcoded E2E credentials (`scripts/create-test-user.ts:12-13`)**
- `e2e-test@complyeur.test` / `E2ETestPassword123!` -- test-only, `.test` TLD

---

## AUDIT 6: GDPR & Data Protection Compliance

**Severity: HIGH | Status: PASS | Issues Found: 1**

### What Works Well

- **DSAR Export (Article 15):** Full implementation generating ZIP with employee data, trips, compliance history, metadata, and GDPR rights README (`lib/gdpr/dsar-export.ts:242-542`). Rate limited, auth-gated, audit-logged.
- **Right to Erasure (Article 17):** Two-phase deletion with 30-day recovery window. Soft delete sets `deleted_at`, hard delete cascades to all related data. Double-confirmation UI requires typing "DELETE" (`components/gdpr/confirm-destructive-action.tsx`)
- **Cascade Deletes:** All FK relationships use CASCADE -- employees, trips, alerts, audit_log, company_settings, import_sessions, profiles all cascade from company deletion
- **Consent at Signup:** Explicit checkbox with Zod validation `termsAccepted: z.boolean().refine((val) => val === true)` (`lib/validations/auth.ts:68-72`)
- **Cookie Consent:** CookieYes integration with category-based consent management
- **Data Minimization:** Employee table stores only `name`, `email` (optional), and timestamps. Passport numbers recognized at import but NOT persisted to database.
- **Audit Logging:** SHA-256 hash chain with `previous_hash` linking (`lib/gdpr/audit.ts:114-143`). `verifyAuditChain()` detects tampering. Four layers of protection: hash chain, database trigger, RLS deny policies, revoked privileges.
- **Data Retention:** Automated daily cron (`vercel.json`) runs retention purge at 3 AM UTC. Configurable retention period (12-84 months).
- **Right to Rectification (Article 16):** Standard CRUD operations fulfill this requirement.
- **Email Unsubscribe:** Token-based, no auth required (correct per CAN-SPAM/GDPR), handles expired/used tokens.
- **Anonymization:** Dedicated anonymization pathway (`lib/gdpr/anonymize.ts`) separate from deletion.

### Findings

**F6-1 [LOW]: Conflicting RLS DELETE policy on `audit_log` (`supabase/migrations/20260206082114_remote_schema.sql:2206`)**
- `"Users can delete audit_log in their company"` nominally allows deletion, but is neutralized by revoked privileges + trigger
- Creates audit confusion; should be dropped for clarity

---

## AUDIT 7: HTTP Security Headers

**Severity: MEDIUM | Status: PARTIAL | Issues Found: 3**

### What Works Well

All headers configured in `next.config.ts:33-79` applied to all routes:

| Header | Value | Status |
|--------|-------|--------|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | EXCELLENT |
| X-Content-Type-Options | `nosniff` | PASS |
| Referrer-Policy | `strict-origin-when-cross-origin` | PASS |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | PASS |
| Content-Security-Policy | `frame-ancestors 'none'` + restrictive `default-src 'self'` | PARTIAL |
| X-Frame-Options | `SAMEORIGIN` | PASS |

### Findings

**F7-1 [MEDIUM]: CSP includes `'unsafe-eval'` and `'unsafe-inline'` in `script-src` (`next.config.ts:60`)**
- Weakens XSS protection significantly -- injected inline scripts and eval() would execute
- Likely required by Next.js/CookieYes/Vercel Analytics -- investigate nonce-based CSP for production

**F7-2 [LOW]: `X-Frame-Options: SAMEORIGIN` inconsistent with `frame-ancestors 'none'`**
- CSP `frame-ancestors 'none'` takes precedence in modern browsers; X-Frame-Options exists for legacy compatibility
- Change to `DENY` for consistency

**F7-3 [LOW]: `X-XSS-Protection` header not present**
- Deprecated header, removed from all modern browsers. CSP replaces it. Not a security gap.

---

## AUDIT 8: Error Handling & Information Leakage

**Severity: HIGH | Status: FAIL | Issues Found: 8**

### What Works Well

- Two comprehensive error mapping modules (`lib/errors.ts` and `lib/errors/index.ts`) suppress raw SQL details
- PostgreSQL error codes (23505, 23503, 42501, etc.) mapped to generic user-friendly messages
- `error.digest` (opaque Next.js hash) displayed on error pages -- safe for correlation
- `DataError` and `ErrorState` components use only pre-defined generic messages
- Error details shown in dev mode only (`process.env.NODE_ENV === 'development'`) -- dead-code-eliminated in production builds

### Findings

**F8-1 [HIGH]: 16+ client components display raw `error.message` in toast notifications**
- Pattern: `catch (error) { toast.error(error instanceof Error ? error.message : '...') }`
- Affected: `add-trip-modal.tsx:65`, `edit-trip-modal.tsx:72`, `delete-trip-dialog.tsx:54`, `bulk-add-trips-form.tsx:161`, `reassign-trip-dialog.tsx:69`, `employee-actions.tsx:45`, `add-employee-dialog.tsx:63`, `edit-employee-dialog.tsx:75`, `login/page.tsx:74`, `signup/page.tsx:81`, `employee-detail-actions.tsx:39`, `quick-add-trip-modal.tsx:69`, `export-form.tsx:108`, `feedback-dialog.tsx:78`
- Server actions in `app/(dashboard)/actions.ts` do NOT wrap errors before throwing -- raw Supabase errors propagate
- Risk: Database table names, constraint names, column references visible in toast notifications

**F8-2 [HIGH]: 6 admin actions return raw `error.message` to client (`app/admin/companies/[id]/actions.ts`)**
- `updateEntitlements` (line 64), `changeTier` (line 103), `extendTrial` (line 172), `convertTrial` (line 207), `suspendCompany` (line 250), `restoreCompany` (line 281)

**F8-3 [HIGH]: Debug test-endpoints page accessible to all authenticated users (`app/(dashboard)/test-endpoints/page.tsx`)**
- 418-line testing UI with no production guard, no admin check
- Allows testing login/signup/password-reset with arbitrary credentials
- Displays raw `error.message` from all test results

**F8-4 [MEDIUM]: Health endpoint leaks raw error messages and app version (`app/api/health/route.ts:19-34`)**
- Unauthenticated, excluded from rate limiting
- Returns `error.message` on database failure + `version` from package.json

**F8-5 [MEDIUM]: Three `error.tsx` files log full error objects to browser console**
- `app/(auth)/error.tsx:15`, `app/(dashboard)/error.tsx:15`, `app/(dashboard)/calendar/error.tsx:15`
- Contrast: root `app/error.tsx` and `app/global-error.tsx` correctly use `Sentry.captureException()`

**F8-6 [MEDIUM]: Error boundary logs full error + component stack to browser console (`components/ui/error-boundary.tsx:52-54`)**
- Exposes internal React component tree structure in DevTools

**F8-7 [MEDIUM]: `verifyTotpAction` returns raw Supabase MFA error message (`lib/actions/mfa.ts:119`)**

**F8-8 [LOW]: Auth callback logs user email (PII) to server console (`app/auth/callback/route.ts:163-168`)**

---

## AUDIT 9: Client-Side Data Exposure

**Severity: HIGH | Status: PASS | Issues Found: 2**

### What Works Well

- No sensitive data in localStorage or sessionStorage -- only a `complyeur_data_updated` timestamp
- Service role key never exposed in frontend code
- Server components use column-specific `select()` queries
- Source maps hidden in production (`next.config.ts:103`)
- Profile hook fetches minimal operational data, no secrets
- Permissions hook exposes only role string

### Findings

**F9-1 [LOW]: Auth error messages briefly appear in URL query strings (`app/auth/callback/route.ts:78-80`)**
- Login page clears via `window.history.replaceState()` but visible for one render cycle
- May be captured by browser history, analytics, or referrer headers

**F9-2 [INFO]: Employee detail page fetches all employees then maps to `(id, name)` (`app/(dashboard)/employee/[id]/page.tsx:79`)**
- Server-side map prevents data reaching client, but fetches more than needed from database

---

## AUDIT 10: Session & Token Management

**Severity: MEDIUM | Status: PARTIAL | Issues Found: 4**

### What Works Well

- JWT expiry: 1 hour (`supabase/config.toml:152`)
- Refresh token rotation enabled with 10-second reuse interval (`config.toml:158-161`)
- Middleware validates JWT on every request via `getUser()` (not just decoding)
- Logout calls `supabase.auth.signOut()` -- server-side invalidation + cache revalidation + redirect
- No session fixation -- tokens generated server-side by Supabase Auth
- MFA backup session cookie: `httpOnly`, `Secure` in production, `SameSite: lax`, explicit 12-hour expiry
- Anonymous sign-ins disabled (`config.toml:165`)
- MFA: Full TOTP + SHA-256 hashed backup codes + backup sessions with proper cookie attributes

### Findings

**F10-1 [HIGH]: Inactive session timeout completely disabled**
- Application-level: commented out (`lib/supabase/middleware.ts:67-91`)
- Supabase-level: `timebox` and `inactivity_timeout` both commented out (`config.toml:248-253`)
- Sessions persist indefinitely through refresh token rotation
- `last_activity_at` is written but never read for enforcement

**F10-2 [MEDIUM]: Minimum password length 6, no complexity requirements (`config.toml:169-172`)**
- Below NIST SP 800-63B recommendation of 8 characters
- `password_requirements = ""` -- no enforcement of mixed case, digits, or symbols
- Note: client-side `signupSchema` enforces 8 + complexity, but Supabase server is the authoritative enforcement point

**F10-3 [LOW]: Email confirmation disabled (`config.toml:203`)**
- Users don't need to verify email before signing in
- Currently mitigated by waitlist mode (signups blocked)

**F10-4 [LOW]: Secure password change disabled (`config.toml:205`)**
- Users can change password without re-authenticating
- Note: `lib/actions/security.ts:46-49` does re-authenticate with current password at the application level

---

## AUDIT 11: Dependency Vulnerabilities

**Severity: MEDIUM | Status: FAIL | Issues Found: 3**

### Findings

**F11-1 [HIGH]: SheetJS `xlsx` v0.18.5 -- ABANDONED, 2 HIGH CVEs (`package.json:73`)**
- CVE-2023-30533: Prototype Pollution (CVSS 7.8) -- exploitable via malicious `.xlsx` upload through import pipeline
- CVE-2024-22363: ReDoS (CVSS 7.5) -- malicious spreadsheet can hang Node.js event loop
- Package abandoned on npm -- no fix will ever ship
- Remediation: Replace with official SheetJS CDN distribution (v0.20.2+) or `exceljs`

**F11-2 [HIGH]: Next.js v16.1.1 -- HTTP Deserialization DoS (`package.json:63`)**
- CVE-2026-23864 (CVSS 7.5): Crafted HTTP requests to server action endpoints cause unbounded CPU/memory consumption
- Directly exploitable against all server actions used for login, signup, import, dashboard operations
- Remediation: Upgrade to `next@16.1.5`

**F11-3 [LOW]: No automated dependency scanning in CI/CD**
- `security:check` script exists (`package.json:27`) but requires manual execution
- No Dependabot, Snyk, or similar automated scanning configured

---

## AUDIT 12: Database Security

**Severity: HIGH | Status: PARTIAL | Issues Found: 5**

### What Works Well

- RLS enabled on all 23 tables with auto-enable trigger for new tables
- All FK cascades correct -- no orphan-producing gaps
- Comprehensive indexes on all `company_id` columns (19+ indexes)
- No tables published to Realtime -- no data leakage via subscriptions
- Most `SECURITY DEFINER` functions use `SET search_path TO ''`
- `prevent_audit_log_modifications()` trigger enforces append-only audit log

### Findings

**F12-1 [MEDIUM]: Waitlist SELECT policy leaks PII to all authenticated users (`migrations/20260206082114_remote_schema.sql:2130`)**
- `USING (true)` allows any authenticated user to read all waitlist entries (emails, company names)

**F12-2 [MEDIUM]: Conflicting audit_log RLS policies -- "deny" policies bypassed by company-scoped "allow" policies**
- Line 2142 vs 2206 (DELETE), Line 2186 vs 2310 (UPDATE)
- PostgreSQL evaluates multiple policies with OR logic -- permissive policy wins
- Trigger is the actual guardrail, but if trigger dropped, audit log becomes fully mutable

**F12-3 [MEDIUM]: `transfer_company_ownership` does not verify caller is current owner**
- `supabase/migrations/20260206143000_owner_roles_and_team_invites.sql:281-333`
- Accepts `p_current_owner_id` as parameter, callable by any authenticated user via RPC

**F12-4 [MEDIUM]: Email confirmation disabled + weak password policy (see Audit 10)**

**F12-5 [LOW]: Two auth trigger functions use `search_path TO 'public'` instead of empty string**
- `handle_auth_user_if_needed()` (line 404), `handle_oauth_user_if_needed()` (line 473)
- Low risk but violates best practice for `SECURITY DEFINER` functions

---

## AUDIT 13: File Upload Security

**Severity: HIGH | Status: PARTIAL | Issues Found: 1**

### What Works Well

- File types whitelisted: `.xlsx`, `.xls`, `.csv` only -- `.xlsm` and `.xlsb` explicitly rejected (`components/import/FileDropzone.tsx:42`)
- File size limited to 10MB, enforced client and server side
- Files parsed in memory only -- never written to filesystem
- CSV injection protection on both import and export paths (OWASP-aligned dangerous characters)
- Import row limits enforced: 500 standard, 5000 Gantt
- `requireCompanyAccess()` called before any writes in inserter (`lib/import/inserter.ts:82-101`)
- No path traversal possible -- filenames stored for display only

### Findings

**F13-1 [MEDIUM]: Import operations lack transaction wrapping (`lib/import/inserter.ts`)**
- `insertTrips()` performs: fetch employees -> restore soft-deleted -> insert new employees -> insert trips -> audit log
- If employee insert succeeds but trip insert fails, employees exist without their trips
- No `BEGIN...COMMIT/ROLLBACK` or Supabase RPC transaction

---

## AUDIT 14: Deployment & Infrastructure

**Severity: MEDIUM | Status: PARTIAL | Issues Found: 4**

### What Works Well

- Source maps hidden from production client bundles (`next.config.ts:103`)
- `.gitignore` covers all env files, certificates, IDE settings
- GDPR retention cron configured in `vercel.json` with fail-closed authentication
- Sentry tunnel route (`/monitoring`) configured correctly
- Rate limiting on API routes and auth endpoints
- No `remotePatterns` configured for image optimization -- limits exploitation surface

### Findings

**F14-1 [HIGH]: Test endpoints page accessible in production (`app/(dashboard)/test-endpoints/page.tsx`)**
- 418-line testing utility, no `NODE_ENV` guard, no admin check
- Any authenticated user can test login/signup/password-reset with arbitrary credentials

**F14-2 [HIGH]: Test email route publicly accessible (`app/api/test-email/route.ts`)**
- Comments say "TEMPORARY - Delete after testing"
- No authentication, reflected XSS potential via `company` parameter

**F14-3 [MEDIUM]: All `/api/` routes treated as public in middleware (`middleware.ts:39`)**
- Each new API route is publicly accessible by default unless it implements its own auth
- Current routes: health (intentionally public), test-email (should not exist), GDPR DSAR (relies on downstream auth), GDPR cron (CRON_SECRET auth)

**F14-4 [LOW]: No Vercel deployment protection for preview branches**
- Anyone with preview URL can access non-production deployments

---

## Summary Table

| Audit | Severity | Status | Issues Found |
|-------|----------|--------|-------------|
| 1. Multi-Tenancy & Data Isolation | CRITICAL | PARTIAL | 7 (3 HIGH, 3 MEDIUM, 1 INFO) |
| 2. Authentication & Authorization | CRITICAL | FAIL | 5 (1 CRITICAL, 2 HIGH, 2 MEDIUM) |
| 3. Server Action & API Security | CRITICAL | PARTIAL | 8 (2 CRITICAL, 3 HIGH, 2 MEDIUM, 1 LOW) |
| 4. Input Validation & Sanitisation | HIGH | PARTIAL | 4 (2 MEDIUM, 1 LOW, 1 INFO) |
| 5. Environment Variables & Secrets | CRITICAL | PASS | 2 (2 LOW) |
| 6. GDPR & Data Protection | HIGH | PASS | 1 (1 LOW) |
| 7. HTTP Security Headers | MEDIUM | PARTIAL | 3 (1 MEDIUM, 2 LOW) |
| 8. Error Handling & Information Leakage | HIGH | FAIL | 8 (3 HIGH, 4 MEDIUM, 1 LOW) |
| 9. Client-Side Data Exposure | HIGH | PASS | 2 (1 LOW, 1 INFO) |
| 10. Session & Token Management | MEDIUM | PARTIAL | 4 (1 HIGH, 1 MEDIUM, 2 LOW) |
| 11. Dependency Vulnerabilities | MEDIUM | FAIL | 3 (2 HIGH, 1 LOW) |
| 12. Database Security | HIGH | PARTIAL | 5 (3 MEDIUM, 1 MEDIUM, 1 LOW) |
| 13. File Upload Security | HIGH | PARTIAL | 1 (1 MEDIUM) |
| 14. Deployment & Infrastructure | MEDIUM | PARTIAL | 4 (2 HIGH, 1 MEDIUM, 1 LOW) |

**Totals: 57 findings** -- 3 CRITICAL, 15 HIGH, 17 MEDIUM, 14 LOW, 2 INFO (some findings overlap across audits)

---

## Launch Blockers (Must Fix)

1. **Upgrade Next.js to 16.1.5** to patch CVE-2026-23864 (HTTP Deserialization DoS)
2. **Replace `xlsx` npm package** with patched SheetJS distribution or alternative library
3. **Add role-based permission checks to 15 dashboard server actions** in `app/(dashboard)/actions.ts`
4. **Delete `app/(dashboard)/test-endpoints/page.tsx`** and **`app/api/test-email/route.ts`**
5. **Add defense-in-depth to read-path data layer** -- `requireCompanyAccess` + `company_id` filtering on `lib/data/employees.ts`, `lib/db/forecasts.ts`, `lib/data/compliance-snapshots.ts`
6. **Wrap server action errors before reaching client** -- use `createSafeAction()` or `safeAction()` from existing error modules in all dashboard actions
7. **Enable session timeout** -- deploy `last_activity_at` migration and uncomment enforcement code, or enable Supabase-level `inactivity_timeout`

## High Priority (Fix Before GA)

8. Add rate limiting to destructive dashboard actions
9. Fix `constantTimeCompare` in cron-auth.ts (use `crypto.timingSafeEqual`)
10. Add auth check to GDPR destructive actions at action level
11. Add auth/rate-limit at route level for DSAR API endpoint
12. Verify `transfer_company_ownership` checks `auth.uid() = p_current_owner_id`
13. Remove conflicting audit_log RLS policies (keep deny + trigger)
14. Fix waitlist SELECT policy to restrict to superadmins
15. Wrap import operations in database transaction
16. Replace `new Date()` with `parseISO()` in validation layer
17. Increase minimum password length to 8 in Supabase config
18. Enable email confirmation before GA launch

---

## Final Verdict: LAUNCH WITH CAUTION

The security architecture is fundamentally sound -- RLS, tenant isolation, GDPR compliance, secret management, and audit logging are all well-implemented. The issues found are primarily about **consistency** (some paths use the security infrastructure, others bypass it) and **dependency vulnerabilities** (outdated packages with known CVEs). The 7 blockers above are addressable without architectural changes.
