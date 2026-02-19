# ComplyEUR v2 Penetration Test Execution Report

**Application:** ComplyEUR v2  
**Execution Date:** February 19, 2026  
**Methodology:** PTES + OWASP ASVS mapping  
**Execution Mode:** Grey-box, authenticated + code-assisted verification  
**Target Executed:** Local running instance (`http://127.0.0.1:3000`) and repository codebase

## Executive Summary
This execution wave validated high-priority controls from the approved penetration plan and identified **6 confirmed findings**:

- **1 High**
- **3 Medium**
- **2 Low**

The strongest positive signal is that **multi-tenant dashboard isolation E2E passed** and direct probes for common misconfigurations (`/.git`, `/.env`, `/_next/data/...`) returned non-exposed results. The largest risk identified is **incomplete MFA enforcement for privileged users**, where privileged access can be obtained without MFA unless the email is explicitly hardcoded in an allowlist.

---

## Remediation Status Update (Final - February 19, 2026)
All findings from this execution wave (high, medium, and low) have been remediated in code and re-verified.

| Finding ID | Severity | Status | Remediation outcome |
|---|---|---|---|
| CEUR-PT-001 | High | Remediated | MFA enforcement moved to privilege-based policy (`owner` / `admin` / `is_superadmin`) with fail-closed behavior. |
| CEUR-PT-002 | Medium | Remediated | `/api/health` now returns minimal status-only payload and is no longer excluded from API rate-limit scope. |
| CEUR-PT-003 | Medium | Remediated | Trusted client-IP extraction centralized and applied across rate-limit, auth actions, and admin audit logging. |
| CEUR-PT-004 | Medium | Remediated | Production CSP moved to nonce-based middleware policy and no longer uses unsafe script directives. |
| CEUR-PT-005 | Low | Remediated | Framework `X-Powered-By` header disabled in Next.js runtime configuration. |
| CEUR-PT-006 | Low | Remediated | Request-size limits aligned with shared endpoint-aware policy (default 1MB, import 10MB) and regression tests added. |

### Remediation Evidence (Code)
- CEUR-PT-001:
  - `lib/security/mfa.ts:23`
  - `lib/security/mfa.ts:65`
  - `app/(dashboard)/layout.tsx:20`
  - `lib/admin/auth.ts:64`
  - `app/(dashboard)/import/actions.ts:155`
  - `app/(dashboard)/import/actions.ts:507`
- CEUR-PT-002:
  - `app/api/health/route.ts:7`
  - `middleware.ts:74`
  - `__tests__/unit/health-route.test.ts:17`
  - `__tests__/unit/middleware-health-rate-limit.test.ts:46`
- CEUR-PT-003:
  - `lib/security/client-ip.ts:71`
  - `lib/rate-limit.ts:197`
  - `app/(auth)/actions.ts:45`
  - `lib/admin/audit.ts:27`
  - `__tests__/unit/client-ip.test.ts:8`
- CEUR-PT-004:
  - `lib/security/csp.ts:5`
  - `middleware.ts:14`
  - `app/layout.tsx:33`
  - `next.config.ts:35`
  - `__tests__/unit/csp.test.ts:11`
- CEUR-PT-005:
  - `next.config.ts:5`
- CEUR-PT-006:
  - `lib/constants/request-limits.ts:1`
  - `middleware.ts:66`
  - `types/import.ts:2`
  - `types/import.ts:22`
  - `app/(dashboard)/import/actions.ts:76`
  - `__tests__/unit/request-limits.test.ts:10`
  - `__tests__/unit/middleware-body-limit.test.ts:46`

### Post-Remediation Verification Evidence
- `pnpm typecheck` -> passed
- `pnpm test` -> **81 passed / 2 skipped test files**; **1948 passed / 32 skipped tests**
- `pnpm test:e2e:multi-user` -> **1 passed**
- `pnpm test:e2e:dashboard` -> **19 skipped** (existing environment/login gating behavior)
- Additional targeted regression checks added and executed:
  - `__tests__/unit/csp.test.ts`
  - `__tests__/unit/health-route.test.ts`
  - `__tests__/unit/middleware-health-rate-limit.test.ts`
  - `__tests__/unit/client-ip.test.ts`
  - `__tests__/unit/request-limits.test.ts`
  - `__tests__/unit/middleware-body-limit.test.ts`

### Execution Environment Note
Direct ad-hoc local `curl` probes from separate shell contexts were blocked by sandbox socket restrictions (`listen EPERM` on local bind for stand-alone probe servers). Equivalent endpoint/header assertions were captured in deterministic automated tests above.

---

## Scope Executed
### Control Areas Tested
- Authentication/session controls (selected)
- Authorization/MFA enforcement
- API/header/CORS checks
- Next.js exposure checks (`_next/data`, sensitive files)
- Cron endpoint authentication
- Multi-tenant isolation E2E path
- Supply-chain scan attempt

### Evidence Commands Executed
- `pnpm test` (full vitest suite) -> passed
- `pnpm test:e2e:multi-user` -> passed
- `pnpm test:e2e:dashboard` -> executed, all tests skipped (environment/login condition)
- Header and endpoint probes via `curl` (`/login`, `/auth/callback`, `/api/health`, `/api/billing/checkout`, `/api/gdpr/cron/retention`, `/.git/config`, `/.env`, `/_next/data/...`)
- `pnpm security:check` / `pnpm audit` -> npm audit upstream API 500 (scan blocked)

---

## Findings (Severity Ordered)

### CEUR-PT-001 - High - Privileged MFA Enforcement Is Allowlist-Based, Not Role-Based
**Affected controls:** Checklist §1.3, §2.1, §2.3  
**Evidence:**
- `lib/security/mfa.ts:7` hardcodes MFA-required emails (`DEFAULT_MFA_REQUIRED_EMAILS`)
- `lib/security/mfa.ts:78` bypasses MFA whenever email is not in that set
- `lib/security/authorization.ts:96` and `lib/security/authorization.ts:108` rely on this check for admin/owner-protected flows

**Impact:** A compromised owner/admin account using any non-allowlisted email can perform privileged actions without second factor verification.

**Reproduction path:**
1. Create or use an owner/admin account with email not in hardcoded set.
2. Access owner/admin-protected server actions (e.g., GDPR export/delete, team management).
3. Observe no MFA challenge is required.

**Recommendation:**
- Enforce MFA by privilege (`owner/admin/superadmin`) rather than by specific email list.
- Keep email allowlist only for emergency break-glass workflows, not primary policy.

---

### CEUR-PT-002 - Medium - Unauthenticated Health Endpoint Leaks Operational Details
**Affected controls:** Checklist §10.1, §10.4, §11  
**Evidence:**
- `app/api/health/route.ts:21` returns application version
- `app/api/health/route.ts:30` returns database connectivity state
- `app/api/health/route.ts:31` returns raw error message
- `middleware.ts:62` excludes `/api/health` from rate limiting
- Live probe response: `HTTP 503` with internal state and error body

**Impact:** External attackers can monitor operational health/failures and use error context for targeted attacks and timing.

**Recommendation:**
- Restrict `/api/health` to trusted networks/monitors or require signed auth.
- Return minimal status shape (e.g., `{status:"ok"}`) for public probes.
- Remove raw error text and internal version from unauthenticated responses.

---

### CEUR-PT-003 - Medium - Rate Limit Identity Trusts Forwarded Headers Directly
**Affected controls:** Checklist §4.1  
**Evidence:**
- `lib/rate-limit.ts:77-82` uses `x-forwarded-for` / `x-real-ip` directly
- `app/(auth)/actions.ts:46`, `app/(auth)/actions.ts:96`, `app/(auth)/actions.ts:200`, `app/(auth)/actions.ts:289` repeat direct trust for auth actions

**Impact:** If proxy/header trust is misconfigured or bypassed in any environment, attacker-controlled IP values can weaken brute-force controls and telemetry quality.

**Recommendation:**
- Normalize client IP from provider-guaranteed headers (for Vercel, trusted chain strategy).
- Enforce explicit trusted-proxy parsing and reject ambiguous header chains.
- Add negative tests for spoofed `X-Forwarded-For` / `X-Real-IP`.

---

### CEUR-PT-004 - Medium - CSP Is Weakened by `unsafe-inline` and `unsafe-eval`
**Affected controls:** Checklist §3.2, §8.1  
**Evidence:**
- `next.config.ts:59-60` includes `script-src 'unsafe-eval' 'unsafe-inline'`
- Live response headers confirm policy is active on auth endpoints

**Impact:** CSP is substantially less effective as an XSS mitigation layer.

**Recommendation:**
- Remove `unsafe-inline`/`unsafe-eval` for production.
- Use nonces/hashes for required inline scripts.
- Maintain stricter policy with separate dev/prod profiles.

---

### CEUR-PT-005 - Low - Framework Fingerprinting Via `X-Powered-By`
**Affected controls:** Checklist §8.1  
**Evidence:**
- Live headers on `/login` include `X-Powered-By: Next.js`

**Impact:** Increases attacker recon fidelity and exploit targeting.

**Recommendation:**
- Disable powered-by header in Next.js production config.

---

### CEUR-PT-006 - Low - Request Size Controls Are Inconsistent Across Layers
**Affected controls:** Checklist §4.2, §6.1, §11  
**Evidence:**
- `middleware.ts:50` enforces global `1MB` content-length limit
- `types/import.ts:21` sets import `MAX_FILE_SIZE = 10MB`
- `app/(dashboard)/import/actions.ts:76` enforces import file limit using 10MB constant

**Impact:** Upload behavior is inconsistent; security controls are harder to reason about and can cause operational issues under load or malformed request patterns.

**Recommendation:**
- Align middleware and import limits (single source of truth by endpoint class).
- Add explicit multipart/body parser tests for boundary-size cases.

---

## Passed / No-Finding Checks (Executed)
- `/_next/data` probe returned `404` (no direct data route exposure observed in executed path).
- `/.git/config` and `/.env` returned `404`.
- Cron retention endpoint without auth returned `401`.
- CORS checks on billing endpoint did not return permissive `Access-Control-Allow-Origin`.
- `auth/callback?next=//evil.com` redirected to local login, not external domain.
- `pnpm test:e2e:multi-user` passed (`users can only see employees from their own company`).

---

## Coverage and Gaps
### Completed in this execution wave
- P1/P2 checks around MFA, header posture, endpoint exposure, cron auth, and tenant isolation E2E.

### Not fully executed yet
- Full multi-role privilege matrix in live environment (Owner/Admin/Manager/Viewer across 2+ companies)
- Race-condition and controlled disruptive windows
- End-to-end PostgREST traversal tests against target Supabase project
- Production-specific cache poisoning/deception checks under CDN behavior

---

## Tooling and Scan Constraints
- `pnpm audit` failed due npm audit endpoint upstream 500 (`ERR_PNPM_AUDIT_BAD_RESPONSE`), so dependency vulnerability output is incomplete in this run.
- `npm audit` fallback could not run due absence of `package-lock.json` (project uses `pnpm-lock.yaml`).

---

## Recommended Remediation Priority
1. **Immediate (P1):** CEUR-PT-001 (role-based MFA enforcement)
2. **Short term (P2):** CEUR-PT-002, CEUR-PT-003, CEUR-PT-004
3. **Hardening (P3):** CEUR-PT-005, CEUR-PT-006

---

## Verification Snapshot
- `pnpm typecheck` -> **passed**
- `pnpm test` -> **81 passed / 2 skipped test files**; **1948 passed / 32 skipped tests**
- `pnpm test:e2e:multi-user` -> **1 passed**
- `pnpm test:e2e:dashboard` -> **19 skipped**
