# Phase 3 — Supabase RLS & Multi-Tenant Isolation Audit

## Verdict
WARNING

## Executive Summary
The core tenant tables are mostly configured with RLS and the later hardening migrations materially improved the design: core CRUD tables use `company_id = get_current_user_company_id()`, suspended tenants are fail-closed by `tenant_active_guard`, `trips/alerts/employee_compliance_snapshots` now carry composite employee/company foreign keys, `audit_log` is append-only, and the old authenticated waitlist read was removed. Evidence includes [supabase/migrations/20260303113000_harden_multi_tenant_boundaries.sql](../supabase/migrations/20260303113000_harden_multi_tenant_boundaries.sql), [supabase/migrations/20260414220000_complete_tenant_isolation_hardening.sql](../supabase/migrations/20260414220000_complete_tenant_isolation_hardening.sql), and [supabase/migrations/20260414170000_create_jobs.sql](../supabase/migrations/20260414170000_create_jobs.sql).

The Phase 3 blockers identified in the earlier `FAIL / NO-GO` pass are now statically addressed in the repo. The new migration [supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql](../supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql) binds the exposed `SECURITY DEFINER` RPCs to authenticated caller context, rejects cross-company identifiers, and narrows execute grants to `authenticated`. The dashboard team snapshot path in [app/(dashboard)/settings/team/actions.ts](../app/(dashboard)/settings/team/actions.ts) now requires `users.view`, and the seat-usage / ownership-transfer RPC calls run through the authenticated client instead of the service-role path.

This moves the audit from `FAIL` to `WARNING`, not `PASS`. The migration has been written and regression coverage added, but no live Supabase SQL/policy verification was executed in this turn. Final `PASS` still requires applying the migration and running the attack plan against a staging or production-like environment.

## Remediation Update
- What was fixed:
  - Hardened `get_company_user_limit`, `get_company_seat_usage`, `transfer_company_ownership`, and `accept_pending_invite_for_auth_user` so authenticated callers are bound to `auth.uid()` / profile company context rather than trusted caller-supplied IDs.
  - Preserved the internal auth-trigger invite-acceptance path while rejecting forged direct RPC identity/email inputs.
  - Tightened the team snapshot authorization to `users.view`, preventing manager/viewer access to invite metadata and seat usage.
  - Removed the authenticated team and billing seat-usage flows from the service-role RPC path.
- Files changed:
  - [supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql](../supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql)
  - [app/(dashboard)/settings/team/actions.ts](../app/(dashboard)/settings/team/actions.ts)
  - [lib/billing/entitlement-middleware.ts](../lib/billing/entitlement-middleware.ts)
  - [__tests__/unit/actions/team-actions-full.test.ts](../__tests__/unit/actions/team-actions-full.test.ts)
  - [__tests__/unit/actions/team-security.test.ts](../__tests__/unit/actions/team-security.test.ts)
  - [__tests__/unit/security/phase3-rls-rpc-hardening.test.ts](../__tests__/unit/security/phase3-rls-rpc-hardening.test.ts)
- Tests added or updated:
  - Added migration/source regression coverage for the hardened RPC security model.
  - Added a direct test that viewer-role callers cannot read the privileged team snapshot.
  - Updated team action tests to cover authenticated-client RPC usage for seat usage and ownership transfer.
- Remaining manual SQL/live Supabase verification still required:
  - Apply the migration to a non-local Supabase environment.
  - Run the direct RPC misuse checks from [audit/03-tenant-attack-test-plan.md](./03-tenant-attack-test-plan.md) with at least two companies and a lower-privilege user.
  - Re-run the policy dump from [audit/03-rls-policy-dump.sql](./03-rls-policy-dump.sql) and archive the resulting evidence.
  - Confirm the auth-trigger invite-acceptance path still succeeds for newly invited users in the live environment.

`deleted_employees` and `exports` were requested in scope, but no separate public tables with those names were found in the generated schema or migrations. Soft-deleted employees are stored in `public.employees.deleted_at`, and exports are handled in application code rather than a dedicated public table.

## Tables Reviewed
| Table | RLS Enabled | Policies Present | Risk |
| --- | --- | --- | --- |
| `admin_audit_log` | Yes | Deny-all for authenticated | Low |
| `alerts` | Yes | Company-scoped + active-tenant guard | Low |
| `audit_log` | Yes | Company-scoped select/insert + restrictive no update/delete | Low |
| `background_jobs` | Yes | Company-scoped + active-tenant guard | Low |
| `billing_email_log` | Yes | No user-facing policies; service-role only | Low |
| `column_mappings` | Yes | Company-scoped + active-tenant guard | Low |
| `companies` | Yes | Own-company read + active-tenant guard | Low |
| `company_entitlements` | Yes | Own-company read + active-tenant guard | High |
| `company_notes` | Yes | Deny-all for authenticated | Low |
| `company_settings` | Yes | Company-scoped + active-tenant guard | Low |
| `company_user_invites` | Yes | Owner/admin only + active-tenant guard | High |
| `employee_compliance_snapshots` | Yes | Company-scoped + active-tenant guard | Low |
| `employees` | Yes | Company-scoped + deleted-row split + active-tenant guard | Low |
| `feedback_submissions` | Yes | Insert self/company only; select owner/admin/superadmin | Low |
| `import_sessions` | Yes | Company-scoped + active-tenant guard | Low |
| `jobs` | Yes | Company-scoped + active-tenant guard | Low |
| `mfa_backup_codes` | Yes | User-scoped | Low |
| `mfa_backup_sessions` | Yes | User-scoped | Low |
| `notification_log` | Yes | Company-scoped + active-tenant guard | Low |
| `notification_preferences` | Yes | User-scoped + active-tenant guard | Low |
| `onboarding_email_log` | Yes | No user-facing policies; service-role only | Low |
| `profiles` | Yes | Self or same-company read; self update only + trigger hardening | Low |
| `schengen_countries` | Yes | Intended public read | Low |
| `stripe_webhook_events` | Yes | No user-facing policies; service-role only | Low |
| `tenant_integrity_quarantine` | Yes | Authenticated deny-all | Low |
| `tiers` | Yes | Intended public read | Low |
| `trips` | Yes | Company-scoped + active-tenant guard | Low |
| `waitlist` | Yes | Public insert only; authenticated read explicitly denied | Low |

## Policy Findings
| Table | Finding | Severity | Fix |
| --- | --- | --- | --- |
| `company_entitlements`, `profiles`, `company_user_invites` | Previous blocker: `public.get_company_user_limit(uuid)` and `public.get_company_seat_usage(uuid)` trusted caller-supplied company IDs. | Patched in repo | Addressed by [supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql](../supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql), which binds both functions to `auth.uid()` / `get_current_user_company_id()`, rejects cross-company inputs, and narrows execute grants. Live RPC verification is still required. |
| `profiles` | Previous blocker: `public.transfer_company_ownership(uuid, uuid, uuid)` authorized by supplied arguments instead of the authenticated caller context. | Patched in repo | Addressed by [supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql](../supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql), which requires `auth.uid()` to be the current owner of the caller company before the transfer can run. Live viewer/admin misuse verification is still required. |
| `company_user_invites`, `profiles` | Previous blocker: `public.accept_pending_invite_for_auth_user(uuid, text)` trusted caller-supplied user identity/email. | Patched in repo | Addressed by [supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql](../supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql), which requires direct RPC callers to match both `auth.uid()` and the email recorded in `auth.users`, while still allowing the trusted auth-trigger path. Live invite-flow verification is still required. |

## Code Findings
| File | Finding | Severity | Fix |
| --- | --- | --- | --- |
| [app/(dashboard)/settings/team/actions.ts](../app/(dashboard)/settings/team/actions.ts) | Previous blocker: `listTeamMembersAndInvites()` allowed `settings.view` users onto an admin-backed team snapshot that included invite metadata and seat usage. | Patched in repo | The action now requires `users.view`, and the sensitive RPC calls use the authenticated client. Viewer/manager denial coverage was added in [__tests__/unit/actions/team-security.test.ts](../__tests__/unit/actions/team-security.test.ts). |

## Attack Simulation Plan
See [audit/03-tenant-attack-test-plan.md](./03-tenant-attack-test-plan.md). The highest-priority live checks are:

1. Direct RPC as Company A user against Company B UUIDs for `get_company_seat_usage` and `get_company_user_limit`.
2. Direct RPC as viewer/manager for `transfer_company_ownership`.
3. Viewer invocation of the dashboard team snapshot action to confirm invite leakage.
4. Standard CRUD cross-tenant attempts against `employees`, `trips`, and `alerts`.

## Remaining Verification Before Launch
1. Apply [supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql](../supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql) to staging or an equivalent Supabase environment.
2. Re-run the SQL evidence dump against the live database and archive the outputs.
3. Execute the tenant attack plan with at least two companies and a viewer account, including the direct RPC misuse checks for seat usage, seat limits, ownership transfer, and invite acceptance.
4. Confirm the invited-user auth callback / middleware flow still provisions profiles correctly after the migration is applied.

## Evidence Files
- [audit/03-rls-policy-dump.sql](./03-rls-policy-dump.sql)
- [audit/03-tenant-attack-test-plan.md](./03-tenant-attack-test-plan.md)
- [audit/03-rls-audit-report.md](./03-rls-audit-report.md)

## Final Go/No-Go
WARNING. Static code and test evidence now address the confirmed Phase 3 blockers, but the audit should not be marked `PASS` until the migration is applied and the live SQL/policy attack checks succeed.
