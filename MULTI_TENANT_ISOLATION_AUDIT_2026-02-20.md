# Multi-Tenant Isolation Audit (Supabase/PostgreSQL)

Date: 2026-02-20
Auditor stance: adversarial, fail-closed, zero-trust.

## Scope coverage
- Database migrations and schema state from `supabase/migrations/*.sql`
- Supabase client usage in `app/`, `lib/`, `supabase/functions/`
- Auth/session glue in middleware and callback handlers
- Existing security and E2E tests

---

### SUMMARY SCORECARD
- Database RLS: **PASS WITH WARNINGS**
- Schema Integrity: **FAIL**
- Query Patterns: **PASS WITH WARNINGS**
- Edge Functions: **PASS WITH WARNINGS**
- Auth/Session: **PASS WITH WARNINGS**
- Frontend Trust: **PASS WITH WARNINGS**
- Adversarial Scenarios: **PASS WITH WARNINGS**

---

### 1) DATABASE LAYER — Row Level Security

#### Tables discovered (public schema)
`admin_audit_log`, `alerts`, `audit_log`, `background_jobs`, `column_mappings`, `companies`, `company_entitlements`, `company_notes`, `company_settings`, `company_user_invites`, `employee_compliance_snapshots`, `employees`, `feedback_submissions`, `import_sessions`, `mfa_backup_codes`, `mfa_backup_sessions`, `notification_log`, `notification_preferences`, `profiles`, `schengen_countries`, `stripe_webhook_events`, `tiers`, `trips`, `waitlist`.

#### RLS enablement status
All listed public tables have `ENABLE ROW LEVEL SECURITY` present in migrations.

#### Policy coverage by table (final state)
- `alerts`: SELECT/INSERT/UPDATE/DELETE policies exist, all scoped by `company_id = get_current_user_company_id()`.
- `audit_log`: SELECT/INSERT/UPDATE/DELETE policies exist scoped to company **plus conflicting deny policies** (`USING/WITH CHECK false`) that do not override permissive policies.
- `background_jobs`, `column_mappings`, `company_settings`, `employee_compliance_snapshots`, `employees`, `import_sessions`, `notification_log`, `trips`: full CRUD policy coverage scoped by company.
- `companies`: SELECT-only policy (`id = get_current_user_company_id()`); INSERT/UPDATE/DELETE missing (default deny).
- `company_entitlements`: SELECT scoped by company; INSERT/UPDATE/DELETE have deny policies.
- `company_notes`: all operations denied (`false`) by policy.
- `company_user_invites`: full CRUD policy coverage scoped by company + role check owner/admin.
- `feedback_submissions`: INSERT + SELECT policies only; no UPDATE/DELETE (default deny).
- `mfa_backup_codes`: full CRUD policies scoped by `auth.uid() = user_id`.
- `mfa_backup_sessions`: SELECT/INSERT/DELETE only; UPDATE missing (default deny).
- `notification_preferences`: full CRUD policies scoped by current user id.
- `profiles`: SELECT (self or same company) + UPDATE self; INSERT/DELETE missing (default deny).
- `schengen_countries`: SELECT USING (true) (public reference table), no write policies.
- `tiers`: SELECT USING (true) (catalog table), write denied.
- `waitlist`: INSERT policy for anon/authenticated with validations; authenticated SELECT USING (true).
- `admin_audit_log`: all operations denied to authenticated role by `false` policies.
- `stripe_webhook_events`: RLS enabled, no authenticated policies (default deny by design; service role only).

#### Open expressions (`USING (true)`)
- Present on: `tiers` SELECT, `schengen_countries` SELECT, `waitlist` authenticated SELECT.
- Assessment:
  - `tiers` and `schengen_countries` are global reference/catalog data (acceptable).
  - `waitlist` authenticated read is broad and should be treated as sensitive if any PII exists (historically risky).

#### Policy joins / subqueries review
- Most tenant policies use direct company equality against `get_current_user_company_id()` (good).
- `feedback_submissions` SELECT includes `EXISTS` subquery to `profiles` for superadmin bypass; this is role-based privileged access and appears intentional.
- No dangerous tenant join pattern found in RLS itself.

#### Service role usage (RLS bypass)
- `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` and explicitly bypasses RLS.
- It is only instantiated in server contexts (server actions, API routes, lib server code, edge/test utilities), not browser client code.

---

### 2) DATABASE LAYER — Schema Integrity

- Tenant tables generally include `company_id` and FK to `companies(id)`.
- **Composite FK gap remains**:
  - `trips`, `alerts`, `employee_compliance_snapshots` each have separate FKs to `employee_id` and `company_id`, but **not** a composite `(employee_id, company_id) -> employees(id, company_id)` guarantee.
  - This allows logically inconsistent rows if inserts are done with service role or via buggy trusted code.
- Nullable `company_id` findings in schema:
  - `company_entitlements.company_id` nullable
  - `company_notes.company_id` nullable
  - (Type drift suggests nullable `profiles.company_id` in generated TS even though base table migration marks NOT NULL.)
- Orphan checks (data-level) could not be executed in this static audit; migration constraints indicate expected FK relationships for major tenant tables.
- **audit_log append-only check failed**:
  - Deny UPDATE/DELETE policies exist, but permissive company-scoped UPDATE/DELETE policies also exist; under permissive RLS semantics, writes are allowed when any permissive policy passes.

---

### 3) API / BACKEND LAYER — Query Patterns

- Broad review of `.from(...)`, `.rpc(...)`, and function invocations completed across `app/`, `lib/`, and edge function code.
- Most tenant reads/writes use one of:
  1) Explicit `.eq('company_id', ...)`, and/or
  2) Pre-check via `requireCompanyAccess(...)`, relying on DB RLS as hard boundary.
- Some ID-only filters exist (`.eq('id', ...)`) in flows that still rely on RLS or pre-validated ownership. This is acceptable but should keep explicit company filters for defense-in-depth when practical.
- Raw SQL use is migration-side only; RPC usage reviewed: `create_company_and_profile`, `accept_pending_invite_for_auth_user`, `get_company_seat_usage`, `unsubscribe_by_token`.
- Service-role queries appear in server-only paths (admin panel, billing webhook, team/invite admin flows, some import/delete operations).

---

### 4) API / BACKEND LAYER — Edge Functions and Server Actions

- Edge functions found: `supabase/functions/auth-hook-prevent-linking`.
  - Uses service role internally in Deno env to query auth admin API.
  - No tenant data operations.
- Server actions/routes with service role are generally gated by authenticated context and role checks (`requireSuperAdmin`, `requireCompanyAccess`, permission gates) before operating.
- Invite/company actions derive effective `company_id` from authenticated profile in server code, not directly from untrusted client payloads.

---

### 5) AUTHENTICATION AND SESSION LAYER

- Company assignment at signup/signin:
  - `create_company_and_profile` creates company + owner profile for new users.
  - `accept_pending_invite_for_auth_user` binds invited users to invited company by normalized email and pending invite state.
- Restricted profile mutation hardening exists: trigger blocks non-service-role updates to `profiles.role`, `profiles.company_id`, and `profiles.is_superadmin`.
- Invite onboarding flow is mostly safe against self-assignment; binding is invite-email-based and locked by DB function.
- JWT/user metadata includes `company_id` for middleware optimization; data-plane authorization still derives from profile lookups + RLS in server queries.
- **Suspended/deleted tenant gating is incomplete globally**:
  - Entitlement middleware checks subscription status in routes that call it, but there is no universal tenant suspension kill-switch enforced in RLS for all reads.

---

### 6) FRONTEND LAYER — Client-Side Trust

- No evidence of deriving tenant context from `localStorage`, URL company params, or user-controlled client state for DB scoping.
- Tenant context primarily comes from authenticated server-side profile access and RLS.
- URL param company IDs exist in admin routes, but server actions validate superadmin access and company permissions before service-role operations.

---

### 7) ADVERSARIAL SCENARIOS

A) **Direct ID enumeration**: blocked by RLS on tenant tables and frequent explicit company filters. PASS WITH WARNINGS (still prefer explicit company filter everywhere).

B) **Cross-tenant trip injection**: normal user path should fail due INSERT policy `WITH CHECK company_id = get_current_user_company_id()`. PASS.

C) **Invite hijack**: acceptance binds by invite email + pending/unexpired row lock; existing profile keeps existing company. PASS WITH WARNINGS (monitor race/edge cases, keep unique constraints strong).

D) **Suspended/deleted tenant access**: not globally blocked at RLS layer; enforcement depends on route-level billing middleware. FAIL.

E) **Service role exposure**: no direct frontend exposure found. Public webhook uses service role but is signature-verified and server-side. PASS WITH WARNINGS.

F) **RLS bypass via join**: no obvious bypass path in current policies; most are direct scalar checks. PASS.

G) **Bulk export leak**: export actions derive company from authenticated profile and apply company filtering; relies on same tenancy controls. PASS WITH WARNINGS.

---

### CRITICAL ISSUES (fix before any production data)

1. **`audit_log` is not truly append-only (UPDATE/DELETE currently possible)**  
   - What it is: contradictory permissive + deny policies on the same table.  
   - Where: `20260206082114_remote_schema.sql` (`Deny update/delete on audit log` plus `Users can update/delete audit_log in their company`).  
   - Exact risk: tenant users can modify/delete their own audit trail, undermining compliance evidence and non-repudiation.  
   - Exact fix: drop permissive UPDATE/DELETE policies on `audit_log`; keep INSERT and SELECT only. Optionally enforce with `BEFORE UPDATE/DELETE` trigger raising exception and table privileges revoke for `authenticated`.

---

### HIGH ISSUES (fix before scaling beyond pilot customers)

1. **Missing composite tenant FK on employee-linked tables**  
   - What it is: `trips`, `alerts`, `employee_compliance_snapshots` do not enforce `(employee_id, company_id)` integrity.  
   - Where: base FK definitions in `20260206082114_remote_schema.sql`.  
   - Exact risk: trusted code/service-role inserts can create cross-tenant logical corruption (`employee_id` from tenant B with `company_id` tenant A).  
   - Exact fix: add unique constraint on `employees(id, company_id)` and composite FKs from each child table to `(id, company_id)`; backfill/clean invalid rows before applying.

2. **Tenant suspension not enforced at universal data boundary**  
   - What it is: suspension exists as entitlement attributes but is not part of core RLS checks for tenant tables.  
   - Where: `company_entitlements` schema and billing middleware logic.  
   - Exact risk: suspended tenants may continue to access core data through routes that skip billing middleware.  
   - Exact fix: add reusable `is_current_company_active()` function and include in RLS `USING/WITH CHECK` across tenant tables (or enforce via restrictive policies / auth hook that blocks sessions).

---

### MEDIUM ISSUES (fix within 30 days of launch)

1. **Nullable `company_id` columns in tenant-adjacent admin tables**  
   - What it is: `company_entitlements.company_id` and `company_notes.company_id` are nullable.  
   - Risk: silent orphan rows and ambiguous tenant ownership in service-role operations.  
   - Fix: migrate to `NOT NULL`, backfill/clean existing nulls, keep FK and unique/index constraints.

2. **Policy gaps relying on default-deny without explicit documentation**  
   - What it is: several tables intentionally omit certain operations (e.g., `companies` no write policies, `feedback_submissions` no update/delete, `mfa_backup_sessions` no update).  
   - Risk: future maintainers may misread as accidental and introduce unsafe writes.  
   - Fix: add comments/migration docs and optional explicit deny policies for clarity.

3. **Open authenticated read on `waitlist`**  
   - What it is: `waitlist` SELECT policy uses `USING (true)` for authenticated users.  
   - Risk: if sensitive fields are present/exposed, authenticated users can read all rows.  
   - Fix: restrict to admin/superadmin-only reads or remove SELECT policy entirely.

---

### PASSED CHECKS

- RLS enabled on all identified public tables.
- Core tenant tables (`employees`, `trips`, `alerts`, etc.) use direct `company_id = get_current_user_company_id()` policy checks.
- Invite table has tenant + role-scoped CRUD policies.
- Service role key is instantiated in server-only modules and protected routes/actions.
- Profile hardening trigger blocks non-service mutation of sensitive membership/privilege columns.
- Security trigger added to auto-enable RLS for new tables via DDL event trigger.

---

### RECOMMENDED TESTS

1. **Cross-tenant ID probe (manual)**: as tenant A, call employee/trip endpoints with tenant B IDs; confirm 404/empty and zero mutation.
2. **Trip injection test**: submit trip payload with forged `company_id`; assert DB rejects with RLS violation.
3. **Audit log immutability test**: attempt UPDATE/DELETE on `audit_log` as authenticated user; assert failure (after fix).
4. **Suspension kill-switch test**: mark company suspended; verify all app routes and direct PostgREST table queries fail.
5. **Invite hijack test**: create account first, then attempt accepting another company invite token/email mismatch; verify no reassignment.
6. **Webhook hardening test**: call billing webhook without valid Stripe signature; verify 400 and no DB changes.

