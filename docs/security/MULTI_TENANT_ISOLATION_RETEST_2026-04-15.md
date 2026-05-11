# Multi-Tenant Isolation Remediation Retest

Date: 2026-04-15
Scope: Remediation of `MULTI_TENANT_ISOLATION_AUDIT_2026-02-20.md` findings.
Retest stance: adversarial, fail-closed, database-first.

## Changes Retested

- Added `supabase/migrations/20260414220000_complete_tenant_isolation_hardening.sql`.
- Updated `lib/security/__tests__/tenant-isolation.test.ts`.
- Added rollback-only adversarial SQL test script at `scripts/retest-multi-tenant-isolation.sql`.

## Before/After Scorecard

| Category | Before | After | Result |
| --- | ---: | ---: | --- |
| Database RLS | 7/10 | 9/10 | Improved. `audit_log` update/delete is now restrictive-denied, write privileges are revoked, and tenant-active restrictive guards exist across tenant-sensitive tables. |
| Schema Integrity | 4/10 | 9/10 | Improved. Composite employee/company FKs are validated for `trips`, `alerts`, and `employee_compliance_snapshots`; nullable ownership columns are tightened. |
| Query Patterns | 8/10 | 8/10 | Preserved. No application query pattern changes were needed for these database-boundary findings. |
| Edge Functions | 8/10 | 8/10 | Preserved. No Edge Function code was changed; service-role usage remains server/Edge-only. |
| Auth/Session | 7/10 | 8/10 | Improved. Suspended or terminally inactive tenant access is now blocked by RLS guard, not only middleware. |
| Frontend Trust | 8/10 | 8/10 | Preserved. No frontend trust assumptions were added. |
| Adversarial Scenarios | 7/10 | 9/10 | Improved. Direct SQL role simulation now verifies the fixed bypass attempts fail. |

Before overall score: 70/100.
After overall score: 84/100.

The after score is higher but still not marked perfect because remote migration history drift must be resolved before production deployment, and app-route UX around suspended accounts should still be checked after deploying the database migration.

## Findings Closed

1. `audit_log` append-only weakness: closed.
   - Dropped known permissive authenticated update/delete policies.
   - Added restrictive `audit_log_append_only_no_update` and `audit_log_append_only_no_delete` policies.
   - Recreated `prevent_audit_log_modifications` trigger.
   - Revoked all authenticated table privileges, then granted back only `SELECT` and `INSERT`.

2. Missing employee/company composite integrity: closed.
   - Added quarantine table for violating rows.
   - Quarantines and removes mismatched rows before validation.
   - Validates composite FKs for `trips`, `alerts`, and `employee_compliance_snapshots`.

3. Suspended tenant DB-boundary access: closed for normal tenant-sensitive tables.
   - Replaced `is_current_company_active()` with fail-closed semantics.
   - Added restrictive `tenant_active_guard` across tenant-sensitive tables, including `employees`, `trips`, `company_settings`, `company_user_invites`, `notification_preferences`, `profiles`, and `jobs` when present.

4. Broad authenticated `waitlist` read: closed.
   - Dropped broad authenticated read policy.
   - Added restrictive read-deny policy.
   - Revoked authenticated `SELECT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`; kept `INSERT`.

5. Nullable tenant-adjacent ownership columns: closed.
   - `company_entitlements.company_id` is `NOT NULL`.
   - `company_notes.company_id` is `NOT NULL`.
   - `company_notes.admin_user_id` is `NOT NULL`.

## Evidence

Migration application:

```text
supabase migration up --local
Applying migration 20260414220000_complete_tenant_isolation_hardening.sql...
Local database is up to date.
```

Unit verification:

```text
npm run test -- lib/security/__tests__/tenant-isolation.test.ts
7 tests passed
```

TypeScript verification:

```text
npm run typecheck
exit code 0
```

Adversarial SQL retest:

```text
docker exec -i supabase_db_complyeur psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/retest-multi-tenant-isolation.sql
multi_tenant_isolation_retest_passed
ROLLBACK
```

Catalog evidence:

```text
audit_log_append_only_no_delete|DELETE|RESTRICTIVE|{authenticated}|false
audit_log_append_only_no_update|UPDATE|RESTRICTIVE|{authenticated}|false|false
tenant_active_guard|ALL|RESTRICTIVE|{authenticated}|is_current_company_active()|is_current_company_active()
```

```text
audit_log authenticated privileges: INSERT, SELECT
waitlist authenticated privileges: INSERT
```

```text
alerts|alerts_employee_company_fkey|f|true
employee_compliance_snapshots|employee_compliance_snapshots_employee_company_fkey|f|true
trips|trips_employee_company_fkey|f|true
```

```text
tenant_active_guard exists on:
alerts, audit_log, background_jobs, column_mappings, companies,
company_entitlements, company_settings, company_user_invites,
employee_compliance_snapshots, employees, feedback_submissions,
import_sessions, jobs, notification_log, notification_preferences,
profiles, trips
```

```text
company_entitlements.company_id|NO
company_notes.admin_user_id|NO
company_notes.company_id|NO
```

```text
waitlist_no_authenticated_read|SELECT|RESTRICTIVE|{authenticated}|false
tenant_integrity_quarantine row count after local migration: 0
```

## Residual Warnings

- `supabase db push` currently stops on remote migration history drift: remote version `20260303100316` is not present locally. Production deployment needs migration-history repair or reconciliation before pushing.
- The retest proved database behavior locally through direct role simulation. After deployment, run a browser/API UX check for suspended users so the app returns clear denial states instead of generic empty data.
- Existing audit `SELECT` and `INSERT` policies remain permissive for `public`, but authenticated access is now also constrained by restrictive `tenant_active_guard`; authenticated update/delete is blocked by restrictive policies, revoked privileges, and trigger enforcement.

## Final Assessment

The system now meets a stronger enterprise-grade tenant isolation bar than before for the audited database-layer controls. The main hard-boundary findings are closed locally with database-enforced constraints, restrictive RLS, privilege hardening, and an adversarial retest that exercises authenticated and service-role failure modes.
