# Production Readiness Assessment (Quick Pass)

_Date:_ 2026-03-06  
_Scope:_ Repository-level production readiness triage based on code/config review and local quality checks.

## Executive Summary

The app has a solid production foundation (security headers, CSP, auth/session middleware, health probe, cron wiring, Sentry instrumentation, and CI), but it is **not release-ready yet** due to failing quality gates and a brittle build dependency on runtime Google Font fetches.

**Release recommendation:** **Hold release** until the blockers below are resolved.

---

## Release Blockers (Must Fix)

1. **Lint currently fails with 82 errors** (165 total findings), including `no-explicit-any`, `no-require-imports`, and React hooks correctness rules. This indicates the current branch does not meet repo lint quality standards.  
   - Command: `pnpm lint`  
   - Notable errors include `hooks/use-online-status.ts` (`react-hooks/set-state-in-effect`) and test/script files with disallowed `any`/`require`.

2. **Unit suite has 2 failing tests** in auth signup redirect parity.  
   - Command: `pnpm test:unit`  
   - Failure: expected `REDIRECT:/login?signup=check-email`, received `REDIRECT:/check-email` in `__tests__/unit/actions/auth-signup.test.ts`.

3. **Production build fails when fetching Google Fonts** (`Montserrat`, `Open Sans`) at build time.  
   - Command: `pnpm build`  
   - This creates deployment fragility in restricted egress or transient network environments.

---

## High-Priority Improvements (Pre-Launch)

1. **Make CI fail hard on lint.** Current CI is configured with `continue-on-error: true` for lint, allowing drift to accumulate before release. Tighten this gate before production promotion.  

2. **Address Next.js middleware deprecation path.** Build output warns that `middleware` file convention is deprecated and should migrate to `proxy`. Plan migration prior to major framework upgrade windows.

3. **Add deterministic font strategy.** Prefer self-hosted/local fonts or a build pipeline tolerant to external font fetch outages.

4. **Re-run dependency vulnerability scanning in CI with a valid registry/audit token path.** Local `pnpm audit` returned `403`, so current vulnerability status cannot be validated from this environment.

---

## Strengths Already in Place

- **Security middleware controls** are present: maintenance mode mutation block, request body size limits, route-aware rate limiting, and auth/session enforcement for protected routes/API.  
- **CSP and security headers** are actively configured (`CSP`, `HSTS`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).  
- **Health endpoint** performs a live Supabase RPC probe and returns `503` on failure (`no-store` cache policy), which is good for uptime checks.  
- **Observability setup** exists with Sentry client + edge init and production-only enablement; source maps are hidden in Next/Sentry config.
- **Automated jobs** are declared via Vercel cron for GDPR retention and other routine flows.

---

## Suggested 7-Day Production Hardening Plan

### Day 1–2 (Quality Gate Stabilization)
- Resolve lint errors to zero, then enforce lint as a required CI blocker.
- Fix the 2 failing auth signup tests and ensure redirect behavior + tests are aligned.

### Day 3 (Build Reliability)
- Remove external Google font fetch dependency during build (local hosting/self-host strategy).
- Re-run `pnpm build` in a CI-like network-restricted environment.

### Day 4 (Security Verification)
- Run audited dependency scan in CI with proper npm audit access.
- Re-run your existing security audit checklist and confirm no stale findings remain open.

### Day 5 (Operational Readiness)
- Confirm Sentry DSN/release/env tagging in production.
- Verify health check integration with deployment platform alarms.

### Day 6–7 (Release Candidate)
- Execute `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, and a smoke subset of Playwright e2e on release candidate.
- Freeze branch and deploy behind staged rollout/canary.

---

## Go/No-Go Criteria

**Go** when all are true:
- `pnpm lint` passes with zero errors.
- `pnpm test:unit` passes fully (no failures).
- `pnpm build` succeeds reliably in CI.
- Dependency scan is green (or accepted exceptions are documented).
- CI gates enforce the above as required checks.

Until then: **No-Go for production release.**
