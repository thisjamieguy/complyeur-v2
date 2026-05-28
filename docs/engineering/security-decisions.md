# Security Decisions

## Summary

ComplyEUR handles sensitive employee travel and compliance data. The permanent security posture is zero-trust tenant isolation, server-side authorization, least privilege, append-only audit trails, safe imports, sanitized logging, and conservative production operations.

## Confirmed Decisions

- Decision: Tenant isolation is a launch-critical security boundary.
  - Why: A cross-company read, export, or mutation is a customer-data breach.
  - Repository alignment: `lib/security/tenant-access.ts`, `__tests__/security/multi-tenancy.test.ts`, `docs/security/MULTI_TENANT_ISOLATION_RETEST_2026-04-15.md`.
  - Confidence: High.

- Decision: RLS is mandatory but not the only control.
  - Why: RLS prevents database-level leakage, but server code must still derive company context from the authenticated user and filter queries explicitly.
  - Repository alignment: `requireCompanyAccess()` derives `company_id` from `profiles.id = auth.user.id`; integration tests assert explicit `company_id` filters.
  - Confidence: High.

- Decision: Service-role clients must stay out of ordinary tenant request paths.
  - Why: Service-role credentials bypass RLS and sharply increase blast radius.
  - Repository alignment: Service-role use is isolated in server-side helpers and security docs.
  - Confidence: High.

- Decision: RBAC checks are required for privileged mutations and exports.
  - Why: UI hiding is not authorization. Viewers and lower-privilege roles must not be able to call server actions directly.
  - Repository alignment: `lib/permissions.ts`, `__tests__/unit/security/`, `__tests__/security/`.
  - Confidence: High.

- Decision: Audit logs are append-only and tamper-evident.
  - Why: Compliance workflows require evidence of who did what, when, and why.
  - Repository alignment: `lib/gdpr/audit.ts`, `lib/admin/audit.ts`, `supabase/migrations/20260414220000_complete_tenant_isolation_hardening.sql`, `supabase/migrations/20260518110000_gdpr_audit_retention_and_export_storage.sql`.
  - Confidence: High.

- Decision: Raw errors and sensitive values must not reach users or logs.
  - Why: Database structure, tokens, email addresses, IPs, and identifiers can become incident material if exposed.
  - Repository alignment: `lib/logger.mjs`, `components/ui/data-error.tsx`, security tests and evidence docs.
  - Confidence: High.

## Historical Context

Historical audits found serious classes of issues: profile self-mutation, missing server-side RBAC, service-role overuse risk, unauthenticated data access, debug surfaces, dependency CVEs, and raw error leakage. Many appear to have been fixed or superseded. Preserve them as checklists, not as current findings.

## Risks / Caveats

- Historical security docs are point-in-time and may describe already-fixed vulnerabilities.
- Git history and deployed environment variables are not fully proven from the repo alone.
- The repo still contains tracked local/debug or evidence artifacts that may merit cleanup, including `.cursor/debug.log` and screenshot evidence files.

## Follow-Up Review Needed

- Run a fresh secret-history review before public release or audit submission.
- Decide whether tracked `.cursor/debug.log` should be removed from git history or current tracking.
- Continue closing partial items in `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`.
- Add automated dependency/security scanning to CI if still absent.

