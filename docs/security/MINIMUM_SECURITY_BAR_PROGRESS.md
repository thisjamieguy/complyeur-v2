# Minimum Security Bar Progress

Date: 2026-06-15
Scope: Repository review only. This file reflects what is visible in code, migrations, tests, and in-repo documentation. It does not claim dashboard-only or infrastructure-only controls unless evidence exists in the repo.

Status legend:
- Done: Implemented with strong code or documented evidence in the repo.
- Partial: Implemented in part, documented without full verification, or depends on external configuration.
- Missing: Not found, or current evidence points to a gap.

## Summary

| Area | Status | Notes |
|---|---|---|
| Standard | Partial | Security review artifacts exist, but no maintained ASVS L1 or OWASP Top 10 2025 checklist artifact found |
| Auth | Partial | Strong password policy, rotation, rate limiting, and privileged-action MFA guardrails exist; login lockout still needs a product decision |
| Authorization | Partial | RLS is strong; billing mutations now require `billing.manage`; full cross-tenant write/delete/export evidence still needs a fresh run |
| Data Protection | Partial | Good controls exist; backup restore, PITR, and secrets hygiene still need external verification |
| App Security | Partial | Headers, validation, import hardening, origin checks, service-role allowlist tests, and CI security workflows exist; CSP nonce/hash enforcement remains staged work |
| Monitoring | Partial | Audit/error logging are strong; Sentry alert routing and auth-abuse alert delivery still need dashboard evidence |
| Compliance | Partial | Privacy/terms/cookie controls are live; deletion/export testing is not fully closed |

## Checklist

### Standard

| Item | Status | Evidence / Notes |
|---|---|---|
| OWASP ASVS Level 1 checklist adopted | Partial | Pentest work references ASVS mapping in `docs/security/2026-02-19-penetration-test-execution-report.md`, but no maintained Level 1 checklist file was found |
| OWASP Top 10 2025 reviewed against app | Partial | General SaaS security audit exists in `docs/security/SAAS_SECURITY_AUDIT.md`, but not an app-specific Top 10 2025 review sheet |

### Auth

| Item | Status | Evidence / Notes |
|---|---|---|
| MFA enforced for admin accounts | Partial | MFA enrollment and enforcement flows exist. Privileged mutation guards now call MFA enforcement for owner/admin-sensitive routes such as billing; a complete privileged-route inventory is still required |
| Strong password rules | Done | Supabase password policy is configured in `supabase/config.toml`; app-level validation exists in `lib/validations/auth.ts` |
| Login rate limiting + lockout | Partial | Rate limiting exists in `proxy.ts`, `lib/rate-limit.ts`, and `app/(auth)/actions.ts`; pentest evidence says account lockout is not in place |
| Secure session expiry / rotation | Done | Refresh token rotation is enabled in `supabase/config.toml`; inactivity timeout evidence exists in `docs/compliance/soc2/evidence/session_timeout_evidence.md` |
| Password reset flow tested | Partial | Reset token expiry/reuse and rate limiting are covered in pentest results; live email/link delivery is still marked as manual verification |

### Authorization

| Item | Status | Evidence / Notes |
|---|---|---|
| RLS enabled on every tenant table | Done | RLS is enabled in Supabase migrations and confirmed in `docs/security/SECURITY_AUDIT_REPORT.md` |
| No cross-company reads/writes possible | Partial | Cross-tenant reads are evidenced; cross-tenant write, delete, and export scenarios remain pending in pentest checklist artifacts |
| Admin/manager/viewer permissions tested | Partial | Role model exists in `lib/permissions.ts`; `PERMISSIONS.BILLING_MANAGE` restricts checkout and portal mutations to owner/admin. Full privilege-escalation matrix remains pending |
| Service-role keys never exposed to client | Done | Service-role usage is isolated to server-side helper `lib/supabase/admin.ts`; no client-side exposure was found in repo code |

### Data Protection

| Item | Status | Evidence / Notes |
|---|---|---|
| HTTPS everywhere | Partial | HSTS is configured in `next.config.ts`; actual production TLS posture is an infrastructure/runtime check |
| Sensitive data encrypted at rest where applicable | Partial | Provider-level at-rest encryption is assumed; application-layer waitlist email encryption is implemented in `lib/security/waitlist-encryption.ts` and `supabase/migrations/20260212113000_waitlist_email_encryption.sql` |
| Secrets only in environment variables / secret manager | Partial | Code expects env vars and warns against exposure, but deployed environment configuration cannot be proven from repo alone |
| No secrets committed to GitHub | Partial | No obvious live secrets were found in app source beyond examples/tests, but this needs Git history and GitHub secret-scanning confirmation |
| Backups enabled and restore tested | Partial | Restore process, RTO, RPO, row-count, RLS, auth, and smoke validation expectations are documented in `docs/RUNBOOK.md`; completed restore-test evidence is still required |

### App Security

| Item | Status | Evidence / Notes |
|---|---|---|
| Server-side validation for all write actions | Partial | Many write paths use Zod and server-side guards; a blanket verified inventory was not found |
| Protection against OWASP Top 10 issues | Partial | Multiple controls are present, but there is no current app-specific closure checklist against Top 10 2025 |
| Security headers configured | Done | Security headers are set in `next.config.ts`; CSP is injected in `proxy.ts` via `lib/security/csp.ts` |
| Safe file upload/import validation | Done | Import upload paths validate size, file type, block macro-enabled spreadsheets, and cap XLSX worksheets/columns/cells in `lib/import/parser.ts` |
| Dependency vulnerability scanning enabled | Partial | `pnpm audit --prod --audit-level high`, dependency review, CodeQL, and Dependabot configuration now exist in `.github/`; GitHub run evidence and branch protection enforcement are still required |
| First-party mutation origin checks | Done | Mutating routes are centrally screened in `proxy.ts` using `lib/security/request-origin.ts` before normal request handling |
| Service-role call sites allowlisted | Done | `__tests__/unit/security/service-role-allowlist.test.ts` statically verifies `createAdminClient()` call sites |

### Monitoring

| Item | Status | Evidence / Notes |
|---|---|---|
| Audit log for important actions | Done | GDPR audit logging exists in `lib/gdpr/audit.ts`; admin audit logging exists in `lib/admin/audit.ts`; append-only DB triggers exist in Supabase migrations |
| Error logging without leaking sensitive data | Done | Redaction logic exists in `lib/logger.mjs`; Sentry capture is wired in `app/error.tsx` and `app/global-error.tsx` |
| Alerts for auth abuse / repeated failures | Partial | Uptime/error alerting evidence exists and Sentry ownership is documented; auth-abuse and alert-delivery proof are still external evidence requirements |
| Basic incident response plan written | Done | Incident playbook exists in `docs/INCIDENT_RESPONSE.md` |

### Compliance

| Item | Status | Evidence / Notes |
|---|---|---|
| Privacy policy + terms + cookie controls live | Done | Public privacy and terms pages exist; CookieYes is loaded in `app/layout.tsx`; analytics consent gating exists in `components/analytics/consent-aware-google-analytics.tsx` |
| Data deletion/export flows tested | Partial | DSAR route and GDPR server actions are protected and tested in part; several GDPR verification items remain open in pentest checklist docs |
| Least-data-necessary approach enforced | Partial | Data minimization signals exist, including delete/anonymize flows and encrypted waitlist storage, but no end-to-end minimization enforcement review was found |

## Highest-Priority Gaps

1. Complete the privileged-route inventory and confirm MFA is enforced for every owner/admin state-changing action.
2. Decide whether login lockout is required in addition to rate limiting, then implement and test it if yes.
3. Run and document a real backup restore test with evidence.
4. Enforce the new dependency/security scanning jobs in branch protection and capture GitHub evidence.
5. Add and test auth-abuse alerting for repeated failures, not just uptime/error monitoring.
6. Close remaining pending authorization and cross-tenant test cases from the pentest checklist.

## Key Evidence References

- `lib/security/mfa.ts`
- `supabase/config.toml`
- `lib/validations/auth.ts`
- `proxy.ts`
- `lib/rate-limit.ts`
- `lib/permissions.ts`
- `lib/supabase/admin.ts`
- `next.config.ts`
- `lib/security/csp.ts`
- `components/import/FileDropzone.tsx`
- `app/(dashboard)/import/actions.ts`
- `lib/gdpr/audit.ts`
- `lib/admin/audit.ts`
- `lib/logger.mjs`
- `.github/workflows/ci.yml`
- `docs/INCIDENT_RESPONSE.md`
- `docs/RUNBOOK.md`
- `docs/compliance/soc2/evidence/session_timeout_evidence.md`
- `docs/compliance/soc2/evidence/uptime_monitoring_evidence.md`
- `docs/security/2026-02-19-pentest-checklist-results.md`
- `docs/security/2026-02-19-penetration-test-execution-report.md`
- `docs/security/SECURITY_AUDIT_REPORT.md`
- `docs/security/INFRASTRUCTURE_9_10_AUDIT_2026-06-15.md`
