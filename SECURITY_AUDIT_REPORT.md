# ComplyEUR Security Audit Report

**Audit Date:** 2026-01-31
**Auditor:** Claude Security Scan
**Scope:** Full codebase scan for security vulnerabilities, exposed secrets, and configuration weaknesses

---

## Executive Summary

The ComplyEUR codebase demonstrates **strong security practices** overall. No critical vulnerabilities were found. The application implements defense-in-depth with RLS, tenant isolation checks, rate limiting, MFA enforcement, and proper secret management. Two medium-severity issues and one low-severity issue were identified.

---

## Findings

### MEDIUM Severity

#### 1. Unprotected Test Email Endpoint
- **What:** `/api/test-email/route.ts` has no authentication
- **Where:** `app/api/test-email/route.ts`
- **Fix:** Add authentication or remove before production deployment (file is marked "TEMPORARY")

#### 2. CSP Allows Unsafe Directives
- **What:** Content-Security-Policy includes `'unsafe-eval'` and `'unsafe-inline'` for scripts/styles
- **Where:** `next.config.ts:60`
- **Fix:** Remove `unsafe-eval` if possible; use nonces for inline scripts/styles

---

### LOW Severity

#### 1. No Explicit CORS Configuration
- **What:** No custom CORS headers defined; relies on default Supabase/Vercel behavior
- **Where:** `next.config.ts`, `vercel.json`
- **Fix:** Consider adding explicit CORS headers if cross-origin API access is needed

---

## Positive Security Findings

### Secrets Management
- No `.env` files committed to repository (properly gitignored)
- No hardcoded API keys, passwords, or tokens found in source code
- Service role key usage restricted to server-side only (`lib/supabase/admin.ts`, edge functions)
- Admin settings page checks key existence without exposing value (Server Component)

### Authentication & Authorization
- Row Level Security (RLS) enabled on all business tables
- Defense-in-depth: `requireCompanyAccess()` validates tenant isolation at application layer
- MFA enforcement for privileged users (`enforceMfaForPrivilegedUser`)
- Password updates require re-authentication
- Admin pages require `requireSuperAdmin()` with MFA verification
- Cron endpoints use fail-closed authentication with constant-time comparison

### Rate Limiting
- Distributed rate limiting via Upstash Redis
- Fail-closed behavior in production (503 if unavailable)
- Tiered limits: API (60/min), Auth (10/min), Password Reset (5/hour)
- Server actions protected via `checkServerActionRateLimit`

### Input Validation
- Zod schema validation throughout server actions
- File upload validation: size limits, MIME types, extension checks
- Macro-enabled files (.xlsm, .xlsb) explicitly blocked
- SQL injection mitigated via Supabase parameterized queries (no raw SQL)

### Security Headers
- HSTS with preload (`max-age=63072000; includeSubDomains; preload`)
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy restricts sensitive features
- frame-ancestors: 'none' in CSP

### Data Protection (GDPR)
- Sentry session replay masks all text and blocks media
- DSAR export requires admin access with company verification
- Audit logging for GDPR actions
- Soft-delete filtering in RLS policies

### Code Patterns
- No `eval()` usage found
- No dangerous `dangerouslySetInnerHTML` in source code (only in build artifacts)
- No SQL injection vectors (uses Supabase client, not raw queries)
- Client components do not access server-only environment variables

---

## Checklist Verification

| Item | Status |
|------|--------|
| All `.env*` files scanned for exposed secrets | PASS - None committed |
| All source files scanned for hardcoded credentials | PASS - None found |
| Supabase service role key usage verified (server-side only) | PASS |
| Client-accessible code checked for leaked env vars | PASS |
| Insecure patterns (eval, dangerouslySetInnerHTML, SQL injection) | PASS |
| Authentication/authorization gaps flagged | PASS - 1 test endpoint noted |
| CORS and CSP configuration reviewed | PARTIAL - CSP has unsafe directives |

---

## Recommendations

### Immediate Actions
1. **Remove or protect `/api/test-email`** before production
2. **Review CSP `unsafe-eval` necessity** - check if Next.js/React actually requires it

### Future Improvements
1. Implement nonce-based CSP for inline scripts
2. Add security.txt file at `/.well-known/security.txt`
3. Consider Subresource Integrity (SRI) for CDN scripts

---

## Files Reviewed

- Configuration: `next.config.ts`, `vercel.json`, `.gitignore`, `middleware.ts`
- Security: `lib/security/*.ts`, `lib/rate-limit.ts`, `lib/admin/auth.ts`
- Supabase: `lib/supabase/*.ts`, `supabase/migrations/*.sql`
- API Routes: `app/api/**/*.ts`
- Server Actions: `app/**/actions.ts`, `lib/actions/*.ts`
- Client Components: All `'use client'` files (118 total)

---

*Report generated from automated security scan. Manual penetration testing recommended for production deployments.*
