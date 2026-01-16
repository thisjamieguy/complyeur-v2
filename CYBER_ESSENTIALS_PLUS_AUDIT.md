# Cyber Essentials Plus Audit Report

**Application:** ComplyEUR v2.0
**Audit Date:** 16 January 2026
**Standard:** UK Government Cyber Essentials Plus (NCSC v3.2, April 2025)
**Auditor:** Claude Code Security Audit
**Scope:** Web application codebase analysis only (device assessment out of scope)

---

## Executive Summary

### Overall Compliance Rating: **PARTIAL**

ComplyEUR demonstrates a strong security foundation with robust implementation of Row Level Security (RLS), rate limiting, security headers, and input validation. However, **critical gaps exist** that must be addressed before Cyber Essentials Plus certification can be achieved.

### Critical Gaps Requiring Immediate Attention

| Priority | Gap | Control Area |
|----------|-----|--------------|
| **CRITICAL** | MFA is non-functional (mockup only) | User Access Control |
| **HIGH** | 2 high-severity npm vulnerabilities (xlsx package) | Security Updates |
| **HIGH** | Password minimum length is 8 chars (CE requires 12 or 8+blocklist) | User Access Control |
| **MEDIUM** | No Dependabot or automated vulnerability scanning | Security Updates |
| **MEDIUM** | Session inactivity timeout not enforced at auth level | User Access Control |

### Estimated Effort to Reach Certification Readiness

| Priority | Effort |
|----------|--------|
| Critical (MFA) | Significant - requires Supabase MFA integration |
| High (Password + Vulnerabilities) | Low - configuration changes |
| Medium (Automation) | Medium - CI/CD pipeline setup |

---

## Detailed Findings by Control Area

---

## 1. Firewalls

**Overall Status:** ✅ Compliant

### 1.1 Boundary Protection

**Status:** ✅ Compliant

**Findings:**
- All protected routes require authentication via middleware (`middleware.ts:23-37`)
- API routes and auth endpoints have rate limiting applied (`middleware.ts:8-15`)
- RLS policies enforce tenant isolation at database level

**Evidence:**
```typescript
// middleware.ts:23-37
const isProtectedRoute = pathname.startsWith('/dashboard') ||
                         pathname.startsWith('/test-endpoints') ||
                         pathname.startsWith('/admin')

if (!user && isProtectedRoute) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

**Recommendations:**
- Consider adding `/api/` routes to middleware protection for defense-in-depth (currently relies on individual route auth checks)

### 1.2 Administrative Interface Protection

**Status:** ✅ Compliant

**Findings:**
- Admin routes require `is_superadmin` flag in profile (`lib/admin/auth.ts:16-38`)
- Admin panel silently redirects unauthorized users to dashboard (no information disclosure)
- Supabase dashboard access is external to application scope

**Evidence:**
```typescript
// lib/admin/auth.ts:33-36
if (profileError || !profile?.is_superadmin) {
  // Silent redirect - don't reveal admin panel exists
  redirect('/dashboard')
}
```

### 1.3 Firewall Rules Documentation

**Status:** ⚠️ Partial

**Findings:**
- Security headers documented in `next.config.ts:33-79`
- No formal firewall rules documentation exists
- CSP policy is well-defined and restrictive

**Evidence:**
```typescript
// next.config.ts:59-61
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.sentry.io; frame-ancestors 'none';",
}
```

**Recommendations:**
- Create formal security rules documentation for certification evidence

---

## 2. Secure Configuration

**Overall Status:** ⚠️ Partial

### 2.1 Default Accounts & Passwords

**Status:** ✅ Compliant

**Findings:**
- No hardcoded credentials found in codebase
- Environment variables used for all secrets (`lib/env.ts`)
- No `.env` files committed to repository

**Evidence:**
```typescript
// lib/env.ts:7-16
function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}.`
    )
  }
  return value
}
```

### 2.2 Unnecessary Software/Services

**Status:** ⚠️ Partial

**Findings:**
- Test endpoints page exists at `/test-endpoints` (development feature)
- Package.json contains only necessary dependencies
- No obvious debug endpoints in production paths

**Recommendations:**
- Ensure `/test-endpoints` is disabled or protected in production builds
- Review and remove any unused dependencies

### 2.3 Auto-Run Prevention

**Status:** ✅ Compliant

**Findings:**
- File uploads are validated before processing
- Macro-enabled files (.xlsm, .xlsb) explicitly blocked
- No automatic code execution from uploaded files

**Evidence:**
```typescript
// app/(dashboard)/import/actions.ts:98-106
// Check for dangerous extensions (macro-enabled files)
const fileName = file.name.toLowerCase();
if (fileName.endsWith('.xlsm') || fileName.endsWith('.xlsb')) {
  return {
    valid: false,
    error: 'Macro-enabled files (.xlsm, .xlsb) are not allowed for security reasons.',
  };
}
```

### 2.4 User Authentication Before Access

**Status:** ✅ Compliant

**Findings:**
- Middleware enforces authentication on protected routes
- RLS policies require `auth.uid()` for all data access
- Server Actions verify authentication before operations

**Evidence:**
```sql
-- supabase/migrations/20250107000001_core_business_tables.sql:100-103
CREATE POLICY "Users can view employees from their company"
  ON employees
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

### 2.5 Device/Session Locking

**Status:** ⚠️ Partial

**Findings:**
- Session timeout configurable in `company_settings` (5-120 minutes)
- JWT expiry set to 3600 seconds (1 hour) in Supabase config
- Supabase auth.sessions inactivity_timeout commented out (not enforced)

**Evidence:**
```toml
# supabase/config.toml:152,248-253
jwt_expiry = 3600

# Configure logged in session timeouts.
# [auth.sessions]
# Force log out if the user has been inactive longer than the specified duration.
# inactivity_timeout = "8h"
```

**Recommendations:**
- Enable `auth.sessions.inactivity_timeout` in Supabase production config
- Implement client-side idle detection to complement server-side timeout

### 2.6 Brute Force Protection

**Status:** ✅ Compliant

**Findings:**
- Distributed rate limiting via Upstash Redis
- Auth endpoints: 10 requests per minute per IP
- Password reset: 5 requests per hour per IP
- This exceeds CE requirement (>10 guesses in 5 minutes blocked)

**Evidence:**
```typescript
// lib/rate-limit.ts:42-50
// Stricter rate limiter for auth endpoints (10 requests per minute)
const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'ratelimit:auth',
      analytics: true,
    })
  : null
```

---

## 3. Security Update Management

**Overall Status:** ❌ Non-Compliant

### 3.1 Licensed & Supported Software

**Status:** ⚠️ Partial

**Findings:**
- All npm dependencies from licensed sources (npm registry)
- `xlsx` package (v0.18.5) is no longer maintained on npm
- Package uses non-standard distribution (cdn.sheetjs.com)

### 3.2 Automatic Updates

**Status:** ❌ Non-Compliant

**Findings:**
- No Dependabot configuration found (`.github/dependabot.yml` missing)
- No `.github/workflows` directory for CI/CD security scanning
- Manual `pnpm audit` script exists but not automated

**Recommendations:**
- Create `.github/dependabot.yml` for automated dependency updates
- Add security scanning to CI/CD pipeline

### 3.3 Critical Vulnerability Timeline

**Status:** ❌ Non-Compliant

**Findings:**
Two HIGH severity vulnerabilities found in `xlsx` package:

| CVE | CVSS | Title |
|-----|------|-------|
| CVE-2023-30533 | 7.8 | Prototype Pollution in SheetJS |
| CVE-2024-22363 | 7.5 | ReDoS vulnerability |

**Evidence:**
```json
// pnpm audit output
{
  "vulnerabilities": {
    "high": 2,
    "critical": 0
  }
}
```

**Recommendations:**
- **IMMEDIATE:** Replace `xlsx` package with patched version from cdn.sheetjs.com (v0.20.2+)
- Implement automated vulnerability scanning in CI/CD
- Document 14-day patching SLA for high/critical vulnerabilities

---

## 4. User Access Control

**Overall Status:** ❌ Non-Compliant

### 4.1 User Account Management

**Status:** ✅ Compliant

**Findings:**
- User registration with email verification available
- Terms acceptance required and timestamped
- Account creation goes through validated flow

### 4.2 Unique Credentials

**Status:** ✅ Compliant

**Findings:**
- Each user has unique email as identifier
- Email normalization prevents duplicates
- No shared account patterns found

### 4.3 Account Removal Process

**Status:** ✅ Compliant

**Findings:**
- Soft delete with 30-day recovery period
- GDPR retention auto-purge implemented
- DSAR export functionality available

### 4.4 Multi-Factor Authentication (MFA)

**Status:** ❌ Non-Compliant (CRITICAL)

**Findings:**
- UI exists in `components/settings/security-settings.tsx`
- **MFA is a mockup only** - no backend implementation
- Supabase MFA is configured but disabled (`enroll_enabled = false`)

**Evidence:**
```typescript
// components/settings/security-settings.tsx:82-89
const handleMfaToggle = async (checked: boolean) => {
  setIsMfaEnabled(checked)
  if (checked) {
    toast.info("MFA setup wizard would start here")  // MOCKUP
  } else {
    toast.warning("MFA has been disabled")
  }
}
```

```toml
# supabase/config.toml:279-281
[auth.mfa.totp]
enroll_enabled = false
verify_enabled = false
```

**Recommendations:**
- **CRITICAL:** Implement Supabase MFA enrollment and verification
- Enable TOTP in Supabase production config
- MFA is **mandatory** for cloud services under Cyber Essentials

### 4.5 Administrative Account Separation

**Status:** ✅ Compliant

**Findings:**
- Super admin role separated from regular users
- Admin access requires `is_superadmin` flag
- Admin functions isolated to `/admin` routes

### 4.6 Password Requirements

**Status:** ⚠️ Partial

**Findings:**
- Minimum 8 characters (CE requires 12, or 8 with deny list)
- Requires uppercase, lowercase, and number
- No common password blocking (deny list)
- No enforced expiry (correct per NCSC guidance)
- No maximum length restriction (correct)

**Evidence:**
```typescript
// lib/validations/auth.ts:14-29
const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')  // Should be 12 OR 8+blocklist
  .refine((val) => /[A-Z]/.test(val), '...')
  .refine((val) => /[a-z]/.test(val), '...')
  .refine((val) => /[0-9]/.test(val), '...')
```

**Recommendations:**
- Either increase minimum length to 12 characters, OR
- Implement common password deny list checking

---

## 5. Malware Protection

**Overall Status:** ✅ Compliant

### 5.1 Anti-Malware Mechanisms

**Status:** ✅ Compliant

**Findings:**
- Input sanitization via Zod validation throughout
- React's built-in XSS protection (JSX escaping)
- SQL injection prevented via Supabase parameterized queries
- CSRF protection via Next.js Server Actions (SameSite cookies)

### 5.2 Malicious Code Prevention

**Status:** ✅ Compliant

**Findings:**
- Strong CSP headers implemented
- No `eval()` usage found in application code
- `dangerouslySetInnerHTML` only in Playwright test reports (not application)
- `frame-ancestors 'none'` prevents clickjacking

**Evidence:**
```bash
# Grep for eval() - no matches in application code
# Grep for dangerouslySetInnerHTML - only in playwright-report/
```

### 5.3 Malicious Website Connection Prevention

**Status:** ✅ Compliant

**Findings:**
- OAuth redirect validation prevents open redirects
- External connections limited to trusted domains via CSP
- URL validation on user inputs

**Evidence:**
```typescript
// app/(auth)/actions.ts:216-219
// Validate redirectTo to prevent open redirect attacks
let validatedRedirect = '/dashboard'
if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
  validatedRedirect = redirectTo
}
```

### 5.4 Application Allow-Listing

**Status:** ❓ Unable to Verify

**Findings:**
- Vercel handles deployment integrity
- No explicit code signing visible in repository
- This is typically handled at infrastructure level

---

## Cloud Services Responsibilities

### Supabase (PaaS) - Shared Responsibility

| Control | Supabase Responsibility | ComplyEUR Responsibility | Status |
|---------|------------------------|-------------------------|--------|
| Firewalls | Platform network security | RLS policies, API auth | ✅ |
| Secure Config | Infrastructure hardening | Database config, RLS | ✅ |
| Security Updates | Platform patches | Application dependencies | ❌ |
| User Access Control | Auth service | MFA implementation | ❌ |
| Malware | Platform security | Input validation | ✅ |

### Vercel (PaaS) - Shared Responsibility

| Control | Vercel Responsibility | ComplyEUR Responsibility | Status |
|---------|----------------------|-------------------------|--------|
| Firewalls | Edge network, DDoS | Application routes | ✅ |
| Secure Config | Infrastructure | Environment variables | ✅ |
| Security Updates | Platform | Application code | ⚠️ |
| User Access Control | Platform auth | Application auth | ⚠️ |
| Malware | Build security | Code security | ✅ |

---

## Gap Analysis Summary Table

| Control Area | Status | Priority | Remediation Effort |
|--------------|--------|----------|-------------------|
| **1. Firewalls** | ✅ Compliant | - | Minor documentation needed |
| **2. Secure Configuration** | ⚠️ Partial | MEDIUM | Session timeout enforcement |
| **3. Security Update Management** | ❌ Non-Compliant | HIGH | Dependency updates + CI/CD |
| **4. User Access Control** | ❌ Non-Compliant | **CRITICAL** | MFA implementation required |
| **5. Malware Protection** | ✅ Compliant | - | None |

---

## Certification Readiness Roadmap

### Phase 1: Critical (Pre-Certification)

1. **Implement MFA (CRITICAL)**
   - Enable Supabase MFA (TOTP) in production config
   - Integrate MFA enrollment flow in `SecuritySettings`
   - Implement MFA verification on login
   - Add MFA recovery codes functionality

2. **Fix High-Severity Vulnerabilities**
   - Replace `xlsx` v0.18.5 with v0.20.2+ from cdn.sheetjs.com
   - Or switch to alternative library (e.g., `exceljs`)
   - Verify no other high/critical CVEs

3. **Update Password Requirements**
   - Increase minimum to 12 characters, OR
   - Implement common password deny list (e.g., NCSC top 100k)

### Phase 2: High Priority (Within 14 Days)

4. **Enable Session Inactivity Timeout**
   - Configure `auth.sessions.inactivity_timeout` in Supabase
   - Recommended: 8 hours for general use

5. **Implement Automated Security Scanning**
   - Create `.github/dependabot.yml`
   - Add security scanning workflow to CI/CD
   - Configure alerts for high/critical vulnerabilities

### Phase 3: Medium Priority (Before Audit)

6. **Document Security Policies**
   - Firewall rules documentation
   - Patching policy (14-day SLA for high/critical)
   - Access control procedures

7. **Review Test Endpoints**
   - Ensure `/test-endpoints` disabled in production
   - Remove any development-only features

---

## Documentation Requirements for Certification

The following policies/documents are required for Cyber Essentials Plus certification:

- [ ] **Information Security Policy** - Overall security governance
- [ ] **Access Control Policy** - User provisioning/deprovisioning procedures
- [ ] **Password Policy** - Minimum requirements (aligned with implementation)
- [ ] **Patch Management Policy** - 14-day SLA for critical vulnerabilities
- [ ] **Firewall Rules Documentation** - Documented security headers and CSP
- [ ] **Incident Response Plan** - Breach notification procedures
- [ ] **Asset Inventory** - Cloud services and dependencies list
- [ ] **MFA Deployment Evidence** - Once implemented

---

## Appendix: Files Reviewed

| File/Path | Purpose | Security Relevance |
|-----------|---------|-------------------|
| `middleware.ts` | Route protection | Authentication enforcement |
| `lib/rate-limit.ts` | Brute force protection | Rate limiting |
| `lib/admin/auth.ts` | Admin access control | Privilege separation |
| `lib/validations/auth.ts` | Password validation | Password requirements |
| `next.config.ts` | Security headers | CSP, HSTS, X-Frame-Options |
| `supabase/config.toml` | Auth configuration | MFA, session settings |
| `supabase/migrations/*.sql` | RLS policies | Data isolation |
| `components/settings/security-settings.tsx` | MFA UI | MFA implementation status |
| `app/(dashboard)/import/actions.ts` | File upload | Upload security |
| `package.json` | Dependencies | Vulnerability surface |

---

**Report Generated:** 16 January 2026
**Next Review:** Upon remediation of critical gaps
