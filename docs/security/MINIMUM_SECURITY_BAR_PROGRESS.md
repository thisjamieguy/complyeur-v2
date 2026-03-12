# Minimum Security Bar Progress

Date: 2026-03-11
Scope: Repository review only. This file reflects what is visible in code, migrations, tests, and in-repo documentation. It does not claim dashboard-only or infrastructure-only controls unless evidence exists in the repo.

Status legend:
- Done: Implemented with strong code or documented evidence in the repo.
- Partial: Implemented in part, documented without full verification, or depends on external configuration.
- Missing: Not found, or current evidence points to a gap.

## Summary

| Area | Status | Notes |
|---|---|---|
| Standard | Partial | Security review artifacts exist, but no maintained ASVS L1 or OWASP Top 10 2025 checklist artifact found |
| Auth | Partial | Strong password policy, rotation, and rate limiting exist; MFA scope and lockout are incomplete |
| Authorization | Partial | RLS is strong, but some permission and cross-tenant scenarios remain only partially verified |
| Data Protection | Partial | Good controls exist, but backup restore and secrets hygiene need external verification |
| App Security | Partial | Headers, validation, and import hardening exist; dependency scanning is not automated |
| Monitoring | Partial | Audit logging and error logging are strong; auth-abuse alerting is not evidenced |
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
| MFA enforced for admin accounts | Partial | MFA enrollment and enforcement flows exist, but current enforcement only triggers for `is_superadmin === true` in `lib/security/mfa.ts` |
| Strong password rules | Done | Supabase password policy is configured in `supabase/config.toml`; app-level validation exists in `lib/validations/auth.ts` |
| Login rate limiting + lockout | Partial | Rate limiting exists in `proxy.ts`, `lib/rate-limit.ts`, and `app/(auth)/actions.ts`; pentest evidence says account lockout is not in place |
| Secure session expiry / rotation | Done | Refresh token rotation is enabled in `supabase/config.toml`; inactivity timeout evidence exists in `docs/compliance/soc2/evidence/session_timeout_evidence.md` |
| Password reset flow tested | Partial | Reset token expiry/reuse and rate limiting are covered in pentest results; live email/link delivery is still marked as manual verification |

### Authorization

| Item | Status | Evidence / Notes |
|---|---|---|
| RLS enabled on every tenant table | Done | RLS is enabled in Supabase migrations and confirmed in `docs/security/SECURITY_AUDIT_REPORT.md` |
| No cross-company reads/writes possible | Partial | Cross-tenant reads are evidenced; cross-tenant write, delete, and export scenarios remain pending in pentest checklist artifacts |
| Admin/manager/viewer permissions tested | Partial | Role model exists in `lib/permissions.ts`; targeted tests exist, but the full privilege-escalation matrix is still pending |
| Service-role keys never exposed to client | Done | Service-role usage is isolated to server-side helper `lib/supabase/admin.ts`; no client-side exposure was found in repo code |

### Data Protection

| Item | Status | Evidence / Notes |
|---|---|---|
| HTTPS everywhere | Partial | HSTS is configured in `next.config.ts`; actual production TLS posture is an infrastructure/runtime check |
| Sensitive data encrypted at rest where applicable | Partial | Provider-level at-rest encryption is assumed; application-layer waitlist email encryption is implemented in `lib/security/waitlist-encryption.ts` and `supabase/migrations/20260212113000_waitlist_email_encryption.sql` |
| Secrets only in environment variables / secret manager | Partial | Code expects env vars and warns against exposure, but deployed environment configuration cannot be proven from repo alone |
| No secrets committed to GitHub | Partial | No obvious live secrets were found in app source beyond examples/tests, but this needs Git history and GitHub secret-scanning confirmation |
| Backups enabled and restore tested | Partial | Restore process, RTO, and RPO are documented in `docs/RUNBOOK.md`, but completed restore-test evidence was not found |

### App Security

| Item | Status | Evidence / Notes |
|---|---|---|
| Server-side validation for all write actions | Partial | Many write paths use Zod and server-side guards; a blanket verified inventory was not found |
| Protection against OWASP Top 10 issues | Partial | Multiple controls are present, but there is no current app-specific closure checklist against Top 10 2025 |
| Security headers configured | Done | Security headers are set in `next.config.ts`; CSP is injected in `proxy.ts` via `lib/security/csp.ts` |
| Safe file upload/import validation | Done | Import upload paths validate size, file type, and block macro-enabled spreadsheets in `components/import/FileDropzone.tsx` and `app/(dashboard)/import/actions.ts` |
| Dependency vulnerability scanning enabled | Partial | Manual audit script exists as `pnpm audit` via `package.json`, but CI does not run dependency scanning or CodeQL |

### Monitoring

| Item | Status | Evidence / Notes |
|---|---|---|
| Audit log for important actions | Done | GDPR audit logging exists in `lib/gdpr/audit.ts`; admin audit logging exists in `lib/admin/audit.ts`; append-only DB triggers exist in Supabase migrations |
| Error logging without leaking sensitive data | Done | Redaction logic exists in `lib/logger.mjs`; Sentry capture is wired in `app/error.tsx` and `app/global-error.tsx` |
| Alerts for auth abuse / repeated failures | Missing | Uptime/error alerting evidence exists, but no auth-abuse or repeated-failure alert rules were evidenced in repo docs or code |
| Basic incident response plan written | Done | Incident playbook exists in `docs/INCIDENT_RESPONSE.md` |

### Compliance

| Item | Status | Evidence / Notes |
|---|---|---|
| Privacy policy + terms + cookie controls live | Done | Public privacy and terms pages exist; CookieYes is loaded in `app/layout.tsx`; analytics consent gating exists in `components/analytics/consent-aware-google-analytics.tsx` |
| Data deletion/export flows tested | Partial | DSAR route and GDPR server actions are protected and tested in part; several GDPR verification items remain open in pentest checklist docs |
| Least-data-necessary approach enforced | Partial | Data minimization signals exist, including delete/anonymize flows and encrypted waitlist storage, but no end-to-end minimization enforcement review was found |

## Highest-Priority Gaps

1. Expand MFA enforcement so it applies to tenant `owner` and `admin` roles, not only `is_superadmin`.
2. Decide whether login lockout is required in addition to rate limiting, then implement and test it if yes.
3. Run and document a real backup restore test with evidence.
4. Add automated dependency/security scanning to CI and branch protection.
5. Add auth-abuse alerting for repeated failures, not just uptime/error monitoring.
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
