# ComplyEUR Security Audit Report

**Date:** 2026-01-10
**Auditor:** Claude (Opus 4.5)
**Scope:** Full application stack security audit

---

## Executive Summary

**Overall Security Posture: GOOD with Notable Gaps**

ComplyEUR demonstrates a mature security architecture with proper multi-tenancy isolation, Row Level Security (RLS) on all tables, and strong server-side validation. However, several critical and high-severity issues require immediate attention before enterprise deployment or regulatory scrutiny.

### Key Strengths
- Multi-tenant data isolation via RLS is comprehensive
- No service_role key exposed in application code
- TypeScript strict mode prevents many class-based vulnerabilities
- Proper parameterized queries prevent SQL injection
- CSV injection prevention in exports
- React auto-escaping prevents XSS

### Critical Issues Requiring Immediate Action
1. **No MFA/2FA enabled** - Account takeover risk
2. **Weak password policy** (6 chars in Supabase config)
3. **Open redirect vulnerability** in auth callback
4. **Test endpoints exposed** in production routes
5. **No Content Security Policy (CSP) headers**
6. **No rate limiting** on Server Actions
7. **Audit logs are mutable** (DELETE policy exists)

---

## Top 10 Critical Risks

| Rank | Risk | Severity | Immediate Action Required |
|------|------|----------|--------------------------|
| 1 | No MFA/2FA | CRITICAL | Enable in Supabase config |
| 2 | Weak Password Policy | CRITICAL | Change minimum to 12+ chars |
| 3 | Open Redirect in Auth Callback | HIGH | Fix redirect validation |
| 4 | Test Endpoints Exposed | HIGH | Remove /test-endpoints |
| 5 | No CSP Headers | HIGH | Add to next.config.ts |
| 6 | No Server Action Rate Limiting | HIGH | Implement rate limiter |
| 7 | Mutable Audit Logs | MEDIUM | Remove DELETE policy |
| 8 | RBAC Gap in Settings | MEDIUM | Add permission checks |
| 9 | No Session Timeout | MEDIUM | Enable in Supabase config |
| 10 | Account Enumeration | LOW | Standardize error messages |

---

## Vulnerability Details

### CRITICAL: Open Redirect Vulnerability

**Location:** `app/auth/callback/route.ts:51-52`

```typescript
const redirectTo = next.startsWith('/') ? next : '/dashboard'
return NextResponse.redirect(`${origin}${redirectTo}`)
```

**Exploit:** `//evil.com` passes the check as it starts with `/`

**Fix:**
```typescript
const redirectTo = next.startsWith('/') && !next.startsWith('//')
  ? next
  : '/dashboard'
```

### CRITICAL: Weak Password Configuration

**Location:** `supabase/config.toml:169`

```toml
minimum_password_length = 6
password_requirements = ""
```

**Fix:**
```toml
minimum_password_length = 12
password_requirements = "lower_upper_letters_digits_symbols"
```

### HIGH: Test Endpoints Accessible

**Location:** `app/(dashboard)/test-endpoints/page.tsx`

The test endpoint page is accessible to authenticated users and could be abused for credential testing or information disclosure.

**Fix:** Remove the route or gate behind environment variable check.

### HIGH: No CSP Headers

**Location:** `next.config.ts` (empty configuration)

**Fix:**
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' *.supabase.co; style-src 'self' 'unsafe-inline';"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ]
  },
};
```

### MEDIUM: Mutable Audit Logs

**Location:** `supabase/migrations/20250107000001_core_business_tables.sql:370-374`

The audit_log table has a DELETE policy, allowing users to remove audit evidence.

**Fix:** Remove the DELETE policy entirely:
```sql
DROP POLICY IF EXISTS "Users can delete audit logs from their company" ON audit_log;
```

### MEDIUM: RBAC Not Enforced on Settings

**Location:** `lib/db/alerts.ts:371-375`

The `updateCompanySettings` function checks authentication but not role permissions.

**Fix:** Add permission check:
```typescript
if (!hasPermission(profile?.role, PERMISSIONS.SETTINGS_UPDATE)) {
  throw new AuthError('Insufficient permissions')
}
```

---

## RLS Policy Assessment

All 10 tables have RLS enabled with appropriate policies:

| Table | RLS | Policies | Notes |
|-------|-----|----------|-------|
| companies | ✅ | SELECT only | Correct |
| profiles | ✅ | SELECT, UPDATE | User + company scope |
| employees | ✅ | Full CRUD | Company-scoped |
| trips | ✅ | Full CRUD | Company-scoped |
| alerts | ✅ | Full CRUD | Company-scoped |
| company_settings | ✅ | Full CRUD | Company-scoped |
| audit_log | ✅ | Full CRUD | ⚠️ DELETE should be removed |
| notification_log | ✅ | SELECT, INSERT, UPDATE | Correctly immutable |
| notification_preferences | ✅ | Full CRUD | User-scoped |
| schengen_countries | ❌ | SELECT only (anon+auth) | Reference data (correct) |

---

## OWASP Top 10 Status

| # | Vulnerability | Status |
|---|---------------|--------|
| A01 | Broken Access Control | ⚠️ PARTIAL - RBAC gaps |
| A02 | Cryptographic Failures | ✅ SAFE |
| A03 | Injection | ✅ SAFE |
| A04 | Insecure Design | ⚠️ PARTIAL - No rate limiting |
| A05 | Security Misconfiguration | ⚠️ PARTIAL - Test endpoints |
| A06 | Vulnerable Components | ✅ LOW RISK |
| A07 | Authentication Failures | ⚠️ HIGH - No MFA |
| A08 | Software/Data Integrity | ⚠️ MEDIUM - Mutable logs |
| A09 | Security Logging Failures | ⚠️ MEDIUM - Incomplete logging |
| A10 | SSRF | ✅ SAFE |

---

## GDPR Compliance Gaps

| Requirement | Status | Action Required |
|-------------|--------|-----------------|
| Data minimization | ✅ Good | - |
| Purpose limitation | ✅ Good | - |
| One-click unsubscribe | ✅ Implemented | - |
| Consent tracking | ⚠️ Missing | Add consent timestamps |
| Right to access (DSAR) | ⚠️ Missing | Build data export feature |
| Right to deletion | ⚠️ Partial | Add self-service deletion |
| Breach notification | ⚠️ Missing | Document process |

---

## Security Hardening Checklist

### Immediate (This Week)
- [ ] Enable MFA/2FA in Supabase config
- [ ] Fix open redirect vulnerability in auth callback
- [ ] Remove or gate test-endpoints route
- [ ] Add CSP headers to next.config.ts
- [ ] Increase password minimum to 12+ chars with complexity
- [ ] Remove audit_log DELETE policy

### Short-term (This Month)
- [ ] Implement Server Action rate limiting
- [ ] Add session inactivity timeout
- [ ] Enforce RBAC on all settings mutations
- [ ] Add authentication event logging
- [ ] Implement CAPTCHA on auth forms

### Medium-term (This Quarter)
- [ ] Implement DSAR self-service
- [ ] Add consent tracking
- [ ] Create incident response runbook
- [ ] Add security monitoring/alerting
- [ ] Consider WAF implementation

---

## Dependencies Analysis

All direct dependencies are up-to-date with no known critical vulnerabilities:

- next: 16.1.1 (latest)
- @supabase/supabase-js: 2.89.0 (latest)
- react: 19.2.3 (latest)
- zod: 4.3.5 (latest)

**Recommendation:** Run `npm audit` regularly and consider Snyk or Dependabot for automated scanning.

---

## What Blocks Enterprise Sales

1. No MFA - Enterprise customers require it
2. No SAML/SSO - Large organizations need IdP integration
3. No audit log immutability - Compliance requirement
4. Weak password policy - Security questionnaires will flag
5. No SOC 2 compliance evidence

---

## Summary

ComplyEUR has a **solid foundation** with proper multi-tenancy isolation and server-side security. The critical fixes outlined above are relatively straightforward to implement and would significantly improve the security posture. Focus on:

1. **Authentication hardening** (MFA, password policy)
2. **Fix the open redirect** (simple code change)
3. **Remove test endpoints** (one file removal)
4. **Add security headers** (config change)
5. **Make audit logs immutable** (remove one policy)

These five changes would address the most critical risks identified in this audit.

---

*This report was generated through static code analysis. Dynamic testing and penetration testing are recommended as follow-up activities.*
