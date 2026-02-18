# Security Audit — ComplyEur v2.0

| Field | Detail |
|-------|--------|
| **Audit Date** | 2026-02-18 |
| **Auditor** | Claude Code (claude-sonnet-4-6) |
| **Codebase** | ComplyEur v2.0 — Next.js + Supabase SaaS |
| **Branch** | `main` |
| **Commit** | `bb01a25` — perf: complete phases 7-10 of performance audit |
| **Status** | In Progress — 16 of 37 findings resolved |

---

## Audit Methodology

Eight parallel agents ran simultaneously across all security domains. Each agent read the relevant source files and cross-referenced against the project's security skill reference (patterns, sharp edges, validations).

| Domain | Agent Scope | Key Files Analysed |
|--------|-------------|-------------------|
| **RLS & Database** | All migration SQL files, RLS policies, function definitions | `supabase/migrations/*.sql` |
| **Server Actions Auth** | Every `'use server'` file, all exported functions | `app/**/actions.ts`, `app/actions/*.ts` |
| **API Routes** | All route handlers, webhook verification, input validation | `app/api/**/route.ts` |
| **Secrets & Env Vars** | All `.env*` files, client-side imports, console.log calls | `.env.*`, `app/**`, `components/**`, `hooks/**` |
| **Middleware, Redirects, CSP** | Security headers, redirect validation, cookie attributes | `middleware.ts`, `next.config.ts`, `app/(auth)/**` |
| **File Upload & GDPR** | Upload validation, GDPR actions, export scoping | `lib/import/**`, `lib/gdpr/**`, `app/(dashboard)/import/**`, `app/(dashboard)/gdpr/**` |
| **Error Handling & XSS** | Error leakage, unsafe HTML rendering, SQL interpolation | `app/api/**`, `app/**/actions.ts`, all `.tsx` |
| **Rate Limiting & MFA** | Coverage of rate limits, MFA enforcement on privileged ops | `lib/rate-limit.ts`, `lib/security/**`, `app/(auth)/actions.ts`, `app/(dashboard)/settings/team/actions.ts` |

---

## Executive Summary

**37 findings total: 11 Critical · 11 High · 11 Medium · 4 Low**

The RLS layer, Stripe webhook verification, open-redirect validation, and file upload controls are well-implemented. The rate limiting infrastructure and MFA system exist and work correctly — they are simply not wired up everywhere they need to be.

The most serious issues are:

1. **Active credentials in env files.** Real Supabase, Stripe, Resend, Upstash, and Google OAuth secrets are present in `.env.local` and `.env.production`. These must be rotated immediately.
2. **Unauthenticated cross-tenant data access.** `getRecentImportSessions()` and `getImportSessionsPaginated()` return data from all companies to any authenticated user — a full multi-tenant breach.
3. **Broken constant-time comparison.** The CRON auth helper XORs `a` with itself (not `b`), making timing attacks trivial on mismatched lengths.
4. **Superadmin backdoor via hardcoded email.** Any attacker who controls the owner email address is auto-promoted to superadmin on next login, with no secondary check.
5. **CSP negated by `unsafe-eval`.** The Content Security Policy includes this directive, which disables XSS protection by allowing dynamic code execution from strings.
6. **Auth actions have no rate limiting.** Login, signup, forgot password, and OAuth flows have no rate limiting — brute force and credential stuffing are unrestricted.

---

## HIGH Priority Findings

> Full detail: category, location, problem, exploit scenario.

---

### C-01 · Secrets — Active credentials in env files

**Category:** Secret Exposure
**Files:** `.env.local`, `.env.production`
**Severity:** CRITICAL

**Problem:** Both files contain real, active secrets — not placeholders. Variables include `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, and Google OAuth credentials.

**Exploit:** Any developer with local repo access can read these values. If either file was ever committed (even briefly before being added to `.gitignore`), the secrets exist in git history. The service role key bypasses all RLS — an attacker can dump every table in the database with a single authenticated API call.

**Fix:** Rotate all credentials immediately. Use Vercel environment variables for production. Audit git history with `git log -p --all -S "sk_test_"` etc.

---

### C-02 · Server Actions — `getRecentImportSessions()` no auth, no company filter

**Category:** Missing Auth / Cross-Tenant Data Leak
**File:** [`app/(dashboard)/import/actions.ts`](../app/%28dashboard%29/import/actions.ts) — Lines 252–277
**Severity:** CRITICAL

**Problem:** Exported server action performs a database query with no `requireCompanyAccessCached()` call and no `company_id` filter. The query returns all import sessions across all companies.

**Exploit:** Any authenticated user (even on the free tier) calls this action and receives import session metadata — file names, row counts, statuses — for every company in the database. This is a GDPR-notifiable data breach.

**Fix:** Add `const { companyId } = await requireCompanyAccessCached()` at the top and append `.eq('company_id', companyId)` to the query.

---

### C-03 · Server Actions — `getImportSessionsPaginated()` no auth, no company filter

**Category:** Missing Auth / Cross-Tenant Data Leak
**File:** [`app/(dashboard)/import/actions.ts`](../app/%28dashboard%29/import/actions.ts) — Lines 291–337
**Severity:** CRITICAL

**Problem:** Identical pattern to C-02. Paginated variant also has no auth check and no company filter.

**Exploit:** Attacker paginates through all import sessions across all companies, up to `perPage = 20` at a time.

**Fix:** Same as C-02 — add `requireCompanyAccessCached()` and scope query to `companyId`.

---

### C-04 · Server Actions — `.single()` without WHERE clause returns arbitrary profile

**Category:** Auth Logic Error
**File:** [`app/(dashboard)/gdpr/actions.ts`](../app/%28dashboard%29/gdpr/actions.ts) — Lines 325–330, 349–358
**Severity:** CRITICAL

**Problem:** Two functions query `profiles` with `.single()` but no `.eq('id', user.id)`. Postgres returns whichever row it encounters first, not necessarily the caller's row.

```typescript
// getGdprAuditLogAction() — line 325
const { data: profile } = await supabase
  .from('profiles')
  .select('company_id, role')
  .single()  // No WHERE — wrong company_id may be returned

// isAdmin() — line 349
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .single()  // No WHERE — wrong role may be returned
```

**Exploit:** `isAdmin()` returns the role of an unpredictable row. If it returns an admin/owner row belonging to another user, privileged GDPR operations are granted to a non-privileged caller.

**Fix:** Add `.eq('id', user.id)` before `.single()` in both functions. Prefer `requireCompanyAccessCached()` which handles this correctly.

---

### C-05 · Server Actions — Silent auth failure in `getEmployeesForGdpr()`

**Category:** Auth Logic Error (Silent Failure)
**File:** [`app/(dashboard)/gdpr/actions.ts`](../app/%28dashboard%29/gdpr/actions.ts) — Lines 28–33
**Severity:** CRITICAL

**Problem:**
```typescript
let ctx
try {
  ctx = await requireCompanyAccessCached()
} catch {
  return []  // Silent — client receives "no employees", not "unauthenticated"
}
```

**Exploit:** Auth failure is invisible to the caller. An attacker probing this endpoint sees HTTP 200 with an empty array — identical to a legitimate empty company. No 401 is raised, no error is logged, and the security boundary fails open.

**Fix:** Remove the try/catch. Let `requireCompanyAccessCached()` throw — the error boundary or action caller handles the redirect to login.

---

### C-06 · API Routes — `constantTimeCompare()` has broken logic

**Category:** Cryptography / Timing Attack
**File:** [`lib/security/cron-auth.ts`](../lib/security/cron-auth.ts) — Line 177
**Severity:** CRITICAL

**Problem:**
```typescript
for (let i = 0; i < a.length; i++) {
  result |= a.charCodeAt(i) ^ a.charCodeAt(i)  // XORs 'a' with itself — always 0
}
```
Should XOR `a.charCodeAt(i)` with `b.charCodeAt(i)`. The loop is dead code that provides zero timing uniformity.

**Exploit:** Timing analysis on the CRON endpoint reveals the expected secret length from response time differences. An attacker can progressively narrow down the secret value via statistical timing measurement.

**Fix:** Replace the entire function with `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`. Pad both inputs to equal length before comparison.

---

### C-07 · CSP — `unsafe-eval` directive negates XSS protection

**Category:** Security Headers
**File:** [`next.config.ts`](../next.config.ts) — Line 60
**Severity:** CRITICAL

**Problem:**
```
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co ...
```

The `unsafe-eval` directive permits dynamic code execution from strings at runtime. Combined with `unsafe-inline`, CSP provides zero protection against XSS. Any injected script executes without restriction.

**Exploit:** A stored XSS payload in any field (employee name, trip note) has unlimited impact — session theft, data exfiltration, arbitrary Supabase queries.

**Fix:** Remove `unsafe-eval`. Identify which dependency requires it (often chart or PDF libraries) and switch to a CSP-compatible alternative, or restrict it to development builds only via `process.env.NODE_ENV`.

---

### C-08 · GDPR — `getDeletedEmployees()` no explicit auth

**Category:** Missing Auth / Tenant Isolation
**File:** [`lib/gdpr/soft-delete.ts`](../lib/gdpr/soft-delete.ts) — Lines 397–415
**Severity:** CRITICAL

**Problem:** Library function queries the `employees` table for soft-deleted rows with no `requireCompanyAccessCached()` and no explicit `company_id` filter — relying entirely on RLS. The action wrapper (`getDeletedEmployeesAction()` at `gdpr/actions.ts:266`) also performs no auth check before calling this function.

**Exploit:** If RLS is misconfigured on a future migration or this function is called via a different code path, deleted employee records from all companies are exposed.

**Fix:** Add `requireCompanyAccessCached()` at the top of `getDeletedEmployees()` and add `.eq('company_id', companyId)` to the query.

---

### C-09 · GDPR — `getRetentionStats()` trusts unverified profile row

**Category:** Missing Auth / Tenant Isolation
**File:** [`lib/gdpr/retention.ts`](../lib/gdpr/retention.ts) — Lines 289–300
**Severity:** CRITICAL

**Problem:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('company_id')
  .single()  // Not scoped to auth.uid()
// Then uses profile.company_id to scope all queries — but it's unverified
```

**Exploit:** The `company_id` driving all subsequent data access is read from an unverified row. If profiles data has any integrity issue, the wrong company's retention statistics and settings are returned.

**Fix:** Replace the profile lookup with `requireCompanyAccessCached()` which returns a session-verified `companyId`.

---

### C-10 · Auth Callback — Hardcoded email auto-promotes to superadmin

**Category:** Auth Bypass / Hardcoded Backdoor
**File:** [`app/auth/callback/route.ts`](../app/auth/callback/route.ts) — Line 231
**Severity:** CRITICAL

**Problem:**
```typescript
const SITE_OWNER_EMAIL = 'james.walsh23@outlook.com'
const isSiteOwner = user.email?.toLowerCase() === SITE_OWNER_EMAIL
if (isSiteOwner) {
  const adminClient = createAdminClient()
  await adminClient.from('profiles')
    .update({ is_superadmin: true, ... })
    .eq('id', user.id)
}
```

**Exploit:** Attacker compromises the email account (phishing, credential stuffing, OAuth exploit, or account takeover) and logs in. On first login they are silently promoted to `is_superadmin: true`, gaining access to every company's data, all admin panel operations, and all GDPR functions. No secondary check, no alert, no audit log entry flagging the promotion.

**Fix:** Remove the auto-promotion block entirely. The `is_superadmin` flag should be set once manually via a migration or Supabase Studio. Do not auto-promote based on email matching in a public auth callback.

---

### C-11 · Rate Limiting — No rate limiting on any auth action

**Category:** Missing Rate Limiting
**File:** [`app/(auth)/actions.ts`](../app/%28auth%29/actions.ts)
**Severity:** CRITICAL

**Problem:** None of the following exported functions call `checkServerActionRateLimit()`:

| Function | Line | Risk |
|----------|------|------|
| `login()` | 43 | Credential brute-force / stuffing |
| `signup()` | 88 | Account enumeration, spam account creation |
| `forgotPassword()` | 187 | Password-reset spam, cost abuse (email sends) |
| `resetPassword()` | 219 | Reset-token brute-force |
| `signInWithGoogle()` | 267 | OAuth request flooding |

**Exploit:** Attacker scripts thousands of login attempts per minute with common passwords against known email addresses. No rate limiting means no defence.

**Fix:** Add `await checkServerActionRateLimit('login')` (with appropriate action names) as the first line of each function, before auth or database calls.

---

### H-01 · Server Actions — Six actions delegate to DB layer without own auth check

**Category:** Missing Auth / Defence in Depth
**Files:** [`app/(dashboard)/actions.ts`](../app/%28dashboard%29/actions.ts), [`app/(dashboard)/gdpr/actions.ts`](../app/%28dashboard%29/gdpr/actions.ts)

| Function | File | Line |
|----------|------|------|
| `getActiveAlertsAction()` | actions.ts | 331 |
| `getUnacknowledgedAlertsAction()` | actions.ts | 337 |
| `getCompanySettingsAction()` | actions.ts | 367 |
| `getNotificationPreferencesAction()` | actions.ts | 391 |
| `getRetentionStatsAction()` | gdpr/actions.ts | 342 |
| `getDeletedEmployeesAction()` | gdpr/actions.ts | 266 |

Each function simply calls through to the DB layer with no auth check at the action boundary. If the underlying function ever has a bug or is called from a different context, the action provides no fallback protection.

**Fix:** Add `await requireCompanyAccessCached()` at the start of each action before the delegation call.

---

### H-02 · API Routes — No UUID validation on `employeeId` path parameter

**Category:** Input Validation
**File:** [`app/api/gdpr/dsar/[employeeId]/route.ts`](../app/api/gdpr/dsar/%5BemployeeId%5D/route.ts) — Lines 29–36

Only checks `if (!employeeId)`. Any string proceeds to the database query. Per the validation reference, all API route inputs must be validated with Zod.

**Fix:** Add `z.string().uuid().parse(employeeId)` before the query. Return 400 on failure.

---

### H-03 · CSP — `X-Frame-Options: SAMEORIGIN` conflicts with `frame-ancestors 'none'`

**Category:** Security Headers
**File:** [`next.config.ts`](../next.config.ts) — Line 48

CSP correctly sets `frame-ancestors 'none'` but the legacy header says `SAMEORIGIN`. Older browsers that don't support the CSP frame-ancestors directive use only `X-Frame-Options` and allow same-origin framing.

**Fix:** Change `value: 'SAMEORIGIN'` to `value: 'DENY'`.

---

### H-04 · CSP — `unsafe-inline` on style-src

**Category:** Security Headers
**File:** [`next.config.ts`](../next.config.ts) — Line 60

Allows arbitrary inline style injection. Enables CSS-based data exfiltration (attribute selectors + background-image requests) and keylogging via CSS.

**Fix:** Investigate whether Tailwind's output requires this in production builds. If not, remove it and use a nonce or hash for any required inline styles.

---

### H-05 · API Routes — Health endpoint returns raw `error.message`

**Category:** Information Disclosure
**File:** [`app/api/health/route.ts`](../app/api/health/route.ts) — Line 31

Publicly accessible endpoint returns raw database error messages on failure (may include connection strings, hostnames, Supabase configuration details).

**Fix:** Return `'Database connectivity check failed'` as a fixed string regardless of underlying error.

---

### H-06 · Secrets — User email logged to server logs

**Category:** PII Exposure / GDPR
**File:** [`app/auth/callback/route.ts`](../app/auth/callback/route.ts) — Lines 184–188, 219

```typescript
console.log('Creating company/profile for new OAuth user:', {
  userId: user.id,
  email,        // PII in Vercel logs — GDPR Article 5 data minimisation violation
  ...
})
```

**Fix:** Remove `email` from the logged object. Log `userId` only if needed for debugging.

---

### H-07 · Rate Limiting — Critical team management actions unprotected

**Category:** Missing Rate Limiting
**File:** [`app/(dashboard)/settings/team/actions.ts`](../app/%28dashboard%29/settings/team/actions.ts)

| Function | Line |
|----------|------|
| `updateTeamMemberRole()` | 323 |
| `removeTeamMember()` | 383 |
| `transferOwnership()` | 445 |
| `revokeInvite()` | 494 |

`transferOwnership()` in particular is irreversible from the original owner's perspective. None have `checkServerActionRateLimit()`.

**Fix:** Add rate limiting to all four. Consider a stricter limit for `transferOwnership()`.

---

### H-08 · Rate Limiting — `anonymizeEmployeeGdpr()` is irreversible with no rate limit

**Category:** Missing Rate Limiting
**File:** [`app/(dashboard)/gdpr/actions.ts`](../app/%28dashboard%29/gdpr/actions.ts) — Line 273

Anonymisation permanently destroys employee identity data. A compromised account can call this in rapid succession with no throttle.

**Fix:** Add `await checkServerActionRateLimit('anonymizeEmployee')` at the top of the function.

---

### H-09 · MFA — No MFA enforcement on team management privileged operations

**Category:** MFA Enforcement
**File:** [`app/(dashboard)/settings/team/actions.ts`](../app/%28dashboard%29/settings/team/actions.ts)

| Function | Line |
|----------|------|
| `inviteTeamMember()` | 233 |
| `updateTeamMemberRole()` | 323 |
| `removeTeamMember()` | 383 |
| `transferOwnership()` | 445 |
| `revokeInvite()` | 494 |

None call `enforceMfaForPrivilegedUser()`. The validation reference explicitly requires this for team management actions. The admin panel correctly enforces MFA — the dashboard team actions must too.

**Fix:** Add `await enforceMfaForPrivilegedUser(supabase, user.id, user.email)` to each function, after the auth check.

---

### H-10 · Rate Limiting — Billing API endpoints unprotected

**Category:** Missing Rate Limiting
**Files:** [`app/api/billing/checkout/route.ts`](../app/api/billing/checkout/route.ts) (POST:99), [`app/api/billing/portal/route.ts`](../app/api/billing/portal/route.ts) (POST:11)

Both create Stripe API sessions on every call with no rate limiting. Cost abuse via session flooding, or Stripe API quota exhaustion.

**Fix:** Add per-user rate limiting before the Stripe API call in both handlers.

---

### H-11 · Rate Limiting — `inviteTeamMembers()` in onboarding can spam emails

**Category:** Missing Rate Limiting / Email Abuse
**File:** [`app/(onboarding)/onboarding/actions.ts`](../app/%28onboarding%29/onboarding/actions.ts) — Line 80

Sends email invites to arbitrary addresses with no rate limit. An authenticated user in the onboarding flow can trigger bulk unsolicited email sends.

**Fix:** Add `await checkServerActionRateLimit('inviteTeamMembers')` at the top of the function.

---

## MEDIUM Priority Findings

| Ref | Category | File | Line | Issue | Fix |
|-----|----------|------|------|-------|-----|
| M-01 | RLS Gap | `supabase/migrations/20260216200000_stripe_billing_hardening_template.sql` | 135 | `stripe_webhook_events` table has no RLS enabled and no policies. Any authenticated user can query raw Stripe webhook payloads containing billing data. | Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + deny-all user policy. Access only via service role in webhook handler. |
| M-02 | Info Disclosure | `app/admin/companies/[id]/actions.ts` | 64, 137, 204, 239, 282, 313 | 6 admin action functions return `error.message` directly — leaks DB schema, constraint names. | Replace with `getDatabaseErrorMessage(error)` from `lib/errors.ts`. |
| M-03 | Info Disclosure | `app/admin/companies/[id]/notes-actions.ts` | 56, 111, 149, 194 | 4 notes action functions return `error.message` directly. Same issue as M-02. | Replace with `getDatabaseErrorMessage(error)`. |
| M-04 | Auth Logic | `app/(dashboard)/bulk-delete.ts` | 87–257 | `getDataCounts()`, `getEmployeesForDeletion()`, `getTripsForDeletion()`, `getMappingsForDeletion()`, `getHistoryForDeletion()` all return empty data on auth failure. Client cannot distinguish "no data" from "unauthenticated". | Throw `AuthError` on auth failure instead of returning defaults. |
| M-05 | Input Validation | `app/(dashboard)/actions.ts` | 120 | `submitFeedbackAction()` validates input with Zod but does not verify company_id before inserting — relies entirely on DB layer. | Call `requireCompanyAccessCached()` before the insert. |
| M-06 | Config | `lib/admin/auth.ts` | 5 | Admin panel email hardcoded in source: `ADMIN_PANEL_ALLOWED_EMAIL`. Committed to version control. | Move to `ADMIN_PANEL_EMAIL` environment variable. |
| M-07 | Billing Logic | `app/api/billing/checkout/route.ts` | 158 | Checkout validates plan slug but does not verify the company is not already subscribed — could allow duplicate subscription creation. | Add entitlement state check before creating Stripe session. |
| M-08 | Input Validation | `app/api/billing/checkout/route.ts` | 99 | Request body validated manually instead of with Zod (violates CLAUDE.md + validation reference). | Replace manual checks with `checkoutSchema.safeParse(body)`. |
| M-09 | File Handling | `app/(dashboard)/import/actions.ts` | 197 | User-provided filename stored verbatim in `import_sessions.file_name`. Control characters could affect logs or downstream display. | Sanitise with `file.name.replace(/[^\w.\-]/g, '_')` before storage. |
| M-10 | Code Quality | `app/(dashboard)/import/actions.ts` | 121 | `checkBulkImportEntitlement()` accepts `useAdminClient: boolean` parameter. Currently called with `false` but the parameter invites future misuse that bypasses RLS. | Remove the parameter. Always use the user client. |
| M-11 | Info Disclosure | `app/api/gdpr/cron/retention/route.ts` | 63 | CRON endpoint returns raw `error.message` in response body. Access restricted to `CRON_SECRET` callers but still a pattern violation. | Return fixed string `'Internal processing error'`. |

---

## LOW Priority Findings

| Ref | File | Line | Issue | Fix |
|-----|------|------|-------|-----|
| L-01 | `app/api/billing/portal/route.ts` | 47 | `return_url` built from `request.url`. Path is hardcoded so no open redirect risk, but environment-dependent and implicit. | Use `process.env.NEXT_PUBLIC_APP_URL + '/settings?section=general'`. |
| L-02 | `lib/actions/mfa.ts` | 25, 61, 104, 127, 173, 208 | MFA actions use bare `getUser()` instead of `requireCompanyAccessCached()`. Functionally correct (MFA is user-scoped) but inconsistent with project patterns. | Consider switching to `requireCompanyAccessCached()` for consistency. |
| L-03 | `app/api/gdpr/dsar/[employeeId]/route.ts` | 25 | DSAR export generation is CPU-intensive. No rate limiting on the API route means authenticated users can trigger many concurrent ZIP operations. | Add per-user rate limiting before the export call. |
| L-04 | `app/(dashboard)/import/actions.ts` | 89 | Filename extension check uses `split('.').pop()` — a file named with multiple extensions passes. Low risk as the XLSX parser validates magic bytes, but not defence-in-depth. | Use `/\.([a-z0-9]+)$/i` regex to extract only the final extension. |

---

## Recommended Implementation Order

> Tick each item as it lands. Add a note with the commit hash.

### Phase 1 — Credential Rotation (Do today, before any code changes)

- [ ] Rotate Supabase anon key and service role key
- [ ] Rotate Supabase database password
- [ ] Rotate Stripe secret key and webhook signing secret
- [x] Rotate Upstash Redis REST token — 2026-02-18
- [x] Rotate Resend API key — 2026-02-18
- [ ] Rotate Google OAuth client ID and secret
- [x] Audit git history — confirmed `.env*` never committed; files gitignored throughout — 2026-02-18
- [x] Move all production secrets to Vercel environment variables — `.env.production` and `.env.staging` deleted — 2026-02-18

---

### Phase 2 — Critical Auth & Data Isolation (This week, highest urgency)

- [x] **C-06** Fix broken `constantTimeCompare()` — replaced with `crypto.timingSafeEqual` — commit `aac1f39` 2026-02-18
- [x] **C-02** Add `requireCompanyAccessCached()` + `company_id` filter to `getRecentImportSessions()` — commit `aac1f39` 2026-02-18
- [x] **C-03** Add `requireCompanyAccessCached()` + `company_id` filter to `getImportSessionsPaginated()` — commit `aac1f39` 2026-02-18
- [ ] **C-10** Remove hardcoded email auto-promotion from `app/auth/callback/route.ts:231` — set `is_superadmin` manually via migration
- [x] **C-04** Replaced unscoped `.single()` in `getGdprAuditLogAction()` and `isAdmin()` with `requireCompanyAccessCached()` — commit `aac1f39` 2026-02-18
- [x] **C-05** Removed silent `return []` from `getEmployeesForGdpr()` — auth failures now propagate — commit `aac1f39` 2026-02-18
- [ ] **C-08** Add `requireCompanyAccessCached()` to `getDeletedEmployees()` — `lib/gdpr/soft-delete.ts:397`
- [ ] **C-09** Add `requireCompanyAccessCached()` to `getRetentionStats()` — `lib/gdpr/retention.ts:289`

---

### Phase 3 — Rate Limiting & MFA Gaps (This week)

- [x] **C-11** Add IP-based rate limiting to `login()` — commit `aac1f39` 2026-02-18
- [x] **C-11** Add IP-based rate limiting to `signup()` — commit `aac1f39` 2026-02-18
- [x] **C-11** Add IP-based rate limiting to `forgotPassword()` — commit `aac1f39` 2026-02-18
- [x] **C-11** Add IP-based rate limiting to `resetPassword()` — commit `aac1f39` 2026-02-18
- [x] **C-11** Add IP-based rate limiting to `signInWithGoogle()` — commit `aac1f39` 2026-02-18
- [ ] **H-07** Add `checkServerActionRateLimit()` to `updateTeamMemberRole()`, `removeTeamMember()`, `transferOwnership()`, `revokeInvite()` — `settings/team/actions.ts`
- [ ] **H-08** Add `checkServerActionRateLimit()` to `anonymizeEmployeeGdpr()` — `gdpr/actions.ts:273`
- [ ] **H-09** Add `enforceMfaForPrivilegedUser()` to all 5 team management actions — `settings/team/actions.ts`
- [ ] **H-10** Add per-user rate limiting to billing checkout and portal API routes
- [ ] **H-11** Add `checkServerActionRateLimit()` to `inviteTeamMembers()` — `onboarding/actions.ts:80`

---

### Phase 4 — Security Headers (This week)

- [ ] **C-07** Remove `unsafe-eval` from `script-src` in CSP — `next.config.ts:60`
- [ ] **H-03** Change `X-Frame-Options` from `SAMEORIGIN` to `DENY` — `next.config.ts:48`
- [ ] **H-04** Investigate removing `unsafe-inline` from `style-src` — determine if production build requires it

---

### Phase 5 — Defensive Hardening (Next sprint)

- [ ] **H-01** Add `requireCompanyAccessCached()` to all 6 delegation-only server actions
- [ ] **H-02** Add Zod UUID validation to `employeeId` path param — `dsar/[employeeId]/route.ts:29`
- [ ] **H-05** Replace raw `error.message` in health endpoint with fixed string — `api/health/route.ts:31`
- [x] **H-06** Remove `email` from `console.log` in auth callback — `auth/callback/route.ts:184` — commit `c4c016e` 2026-02-18
- [x] **M-01** Add RLS + deny-all policy to `stripe_webhook_events` table — applied via SQL Editor to production — 2026-02-18
- [ ] **M-02 / M-03** Replace `error.message` with `getDatabaseErrorMessage()` in 10 admin action functions
- [ ] **M-04** Replace silent empty-data returns with thrown `AuthError` in bulk-delete functions
- [ ] **M-05** Add `requireCompanyAccessCached()` to `submitFeedbackAction()` before insert
- [ ] **M-06** Move hardcoded admin panel email to `ADMIN_PANEL_EMAIL` environment variable
- [ ] **M-08** Migrate checkout request body validation from manual checks to Zod schema
- [ ] **M-09** Sanitise filenames before storing in `import_sessions.file_name`
- [ ] **M-10** Remove `useAdminClient` parameter from `checkBulkImportEntitlement()`
- [ ] **M-11** Replace raw error.message in CRON retention route response

---

### Phase 6 — Low-Priority Polish (As bandwidth allows)

- [ ] **L-01** Use `NEXT_PUBLIC_APP_URL` instead of `request.url` for billing portal return URL
- [ ] **L-02** Consider switching MFA actions to use `requireCompanyAccessCached()` for consistency
- [ ] **L-03** Add per-user rate limiting to DSAR export API route
- [ ] **L-04** Improve filename extension regex in import validation
- [ ] **M-07** Add entitlement state check before creating Stripe checkout session

---

## Verification Protocol

Run after completing each phase before marking items done.

```bash
# 1. TypeScript — must compile clean
npm run typecheck

# 2. Unit tests — must all pass
npm run test:unit

# 3. Integration tests
npm run test:integration

# 4. Production build — must succeed
npm run build

# 5. E2E smoke test — auth flow + dashboard load
npm run test:e2e
```

**Manual checks after Phase 2 (auth/import changes):**
- Login with correct credentials → succeeds
- Import sessions page only shows current company's data
- GDPR actions require correct company context
- Admin email no longer auto-promotes on login

**Manual checks after Phase 3 (rate limiting):**
- Login with wrong credentials × 6 rapid → rate limit triggered (429)
- Signup rate limit triggers after threshold
- `forgotPassword()` rate-limited per IP

**Manual checks after Phase 4 (headers):**
- Browser DevTools → Network → response headers show CSP without `unsafe-eval`
- `X-Frame-Options: DENY` present
- CSP includes `frame-ancestors 'none'`

---

## What Is Working Well

These areas were audited and found to be correctly implemented — no changes needed.

| Area | Evidence |
|------|----------|
| Stripe webhook signature verification | Raw body + `constructWebhookEvent()` before any event processing |
| Open redirect protection | `validateRedirectUrl()` used in both `login()` and `signInWithGoogle()` |
| RLS on all 25 tables | Fully enabled; `get_current_user_company_id()` with `SECURITY DEFINER` + locked `search_path` |
| `rls_auto_enable()` event trigger | Function existed but event trigger was missing — created and applied to production 2026-02-18 |
| Rate limit fail-closed | Production rejects all requests if Upstash is unavailable |
| MFA enforcement on admin panel | `enforceMfaForPrivilegedUser()` in `lib/admin/auth.ts` |
| DSAR export auth and isolation | `requireAdminAccess()` enforced; company isolation correct |
| File upload type + size validation | Allowlist (MIME + extension); macro files blocked; 10 MB limit |
| No unsafe HTML rendering in React | Zero XSS injection vectors found in any component |
| No raw SQL template literals | All queries use Supabase SDK parameterised builder |
| No service role key in client code | `createAdminClient` correctly isolated to server-only files |
| HSTS configured | `max-age=63072000; includeSubDomains; preload` |
| Auth cookie security | `httpOnly: true`, `secure` in production, `sameSite: 'lax'` |
| Audit logging | `logExport()`, `logAdminAction()`, `logGdprAction()` tracking in place |

---

## Completed Fixes

> Items are moved here from the phase checklists once the fix lands. Include commit hash and date.

| Ref | Fix Applied | Commit | Date |
|-----|------------|--------|------|
| Phase 1 | `.env.production` + `.env.staging` deleted; all secrets moved to Vercel | — | 2026-02-18 |
| Phase 1 | Resend API key rotated and updated in Vercel | — | 2026-02-18 |
| Phase 1 | Upstash Redis REST token rotated and updated in Vercel; quote marks removed from `UPSTASH_REDIS_REST_URL` value | — | 2026-02-18 |
| Phase 1 | Git history confirmed clean — `.env*` never committed | — | 2026-02-18 |
| M-01 | `stripe_webhook_events` RLS enabled via SQL Editor on production; deny-all by default (service role only access) | `c4c016e` | 2026-02-18 |
| — | `rls_auto_enable` event trigger created and applied to production | applied via SQL Editor | 2026-02-18 |
| H-06 | `email` removed from OAuth callback console.log; all high/medium-risk console statements sanitised to `.message` only | `c4c016e` | 2026-02-18 |
| — | `complyeur@gmail.com` added as site owner across all 5 auth check locations | `a1d991b` | 2026-02-18 |
| C-02 | `getRecentImportSessions()` scoped to `companyId` with `requireCompanyAccessCached()` | `aac1f39` | 2026-02-18 |
| C-03 | `getImportSessionsPaginated()` scoped to `companyId` with `requireCompanyAccessCached()` | `aac1f39` | 2026-02-18 |
| C-04 | Replaced unscoped `.single()` in `getGdprAuditLogAction()` and `isAdmin()` with `requireCompanyAccessCached()` | `aac1f39` | 2026-02-18 |
| C-05 | Removed silent `return []` from `getEmployeesForGdpr()` — auth failures now propagate | `aac1f39` | 2026-02-18 |
| C-06 | `constantTimeCompare()` replaced with `crypto.timingSafeEqual` — XOR bug eliminated | `aac1f39` | 2026-02-18 |
| C-11 | IP-based rate limiting added to all 5 auth actions (login, signup, forgotPassword, resetPassword, signInWithGoogle) | `aac1f39` | 2026-02-18 |
