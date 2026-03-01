# Authorization Follow-Up Audit

**Date:** 2026-02-28
**Scope:** Continue the pending security backlog with a focused review of privileged server actions, authorization guard consistency, and defense-in-depth around authenticated mutations.

## Executive Summary

This follow-up found one high-severity control gap and two lower-severity hardening gaps in the authorization surface.

The most important issue is that several owner/admin-only server actions do **not** enforce MFA inside the mutation handler itself. MFA is enforced in the dashboard layout, but that only protects normal page navigation. A privileged user who still has an authenticated AAL1 session can potentially invoke the underlying server-action POST directly and reach sensitive mutations without satisfying the intended MFA policy.

## Findings

### AF-001 [HIGH] Privileged server actions rely on layout-level MFA instead of enforcing MFA inside the mutation

**Impact:** Owner/admin-only actions can potentially be invoked directly with an authenticated but not MFA-verified session, bypassing the intended second-factor control for sensitive operations.

**Why this is a finding**

- The central MFA policy requires MFA for `owner`, `admin`, and superadmin users in [`lib/security/mfa.ts:26`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/security/mfa.ts#L26) and [`lib/security/mfa.ts:62`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/security/mfa.ts#L62).
- The dashboard layout enforces that policy during page rendering in [`app/(dashboard)/layout.tsx:22`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/layout.tsx#L22).
- However, several privileged mutations do not call `enforceMfaForPrivilegedUser()` or a wrapper such as `requireAdminAccess()` inside the server action / helper itself.

**Affected examples**

- Team management mutations in [`app/(dashboard)/settings/team/actions.ts:233`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L233), [`app/(dashboard)/settings/team/actions.ts:323`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L323), [`app/(dashboard)/settings/team/actions.ts:383`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L383), [`app/(dashboard)/settings/team/actions.ts:445`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L445), [`app/(dashboard)/settings/team/actions.ts:494`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L494)
- Company settings mutation in [`lib/actions/settings.ts:63`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/actions/settings.ts#L63)
- GDPR destructive actions delegated through [`app/(dashboard)/gdpr/actions.ts:188`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/gdpr/actions.ts#L188), [`app/(dashboard)/gdpr/actions.ts:226`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/gdpr/actions.ts#L226), [`app/(dashboard)/gdpr/actions.ts:268`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/gdpr/actions.ts#L268), with underlying helpers in [`lib/gdpr/soft-delete.ts:68`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/gdpr/soft-delete.ts#L68), [`lib/gdpr/soft-delete.ts:238`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/gdpr/soft-delete.ts#L238), [`lib/gdpr/anonymize.ts:80`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/gdpr/anonymize.ts#L80)
- Bulk delete path using the service-role client in [`lib/actions/bulk-delete.ts:276`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/actions/bulk-delete.ts#L276)

**Recommendation**

Add a shared privileged-mutation guard that combines:

1. authenticated user lookup
2. company/role lookup
3. permission check
4. MFA enforcement for privileged roles
5. rate limiting

Then require all owner/admin-only server actions to call that guard before mutation.

### AF-002 [MEDIUM] Multiple privileged mutation handlers are not rate-limited server-side

**Impact:** An authenticated attacker, compromised browser session, or buggy client can repeatedly trigger high-cost or destructive mutations without the server-side abuse controls already used elsewhere in the codebase.

**Why this is a finding**

- The codebase already uses `checkServerActionRateLimit()` for some sensitive actions, for example DSAR export in [`app/(dashboard)/gdpr/actions.ts:100`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/gdpr/actions.ts#L100) and team invites in [`app/(dashboard)/settings/team/actions.ts:241`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L241).
- Equivalent protections are absent from other privileged mutations such as role changes, user removal, ownership transfer, invite revocation, settings updates, employee deletion/restoration/anonymization, and bulk delete.

**Affected examples**

- [`app/(dashboard)/settings/team/actions.ts:323`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L323)
- [`app/(dashboard)/settings/team/actions.ts:383`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L383)
- [`app/(dashboard)/settings/team/actions.ts:445`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L445)
- [`app/(dashboard)/settings/team/actions.ts:494`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/app/(dashboard)/settings/team/actions.ts#L494)
- [`lib/actions/settings.ts:63`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/actions/settings.ts#L63)
- [`lib/gdpr/soft-delete.ts:68`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/gdpr/soft-delete.ts#L68)
- [`lib/gdpr/soft-delete.ts:238`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/gdpr/soft-delete.ts#L238)
- [`lib/gdpr/anonymize.ts:80`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/gdpr/anonymize.ts#L80)
- [`lib/actions/bulk-delete.ts:276`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/lib/actions/bulk-delete.ts#L276)

**Recommendation**

Apply `checkServerActionRateLimit()` consistently to all privileged state-changing server actions, especially those that:

- create or revoke access
- modify roles
- delete or anonymize data
- operate through the service-role client

### AF-003 [LOW] Middleware still classifies `/api/*` routes as public and depends on each handler to enforce auth

**Impact:** Current route handlers appear to be checking auth in-handler, so this is a defense-in-depth gap rather than a confirmed bypass. The risk is that a future API route can accidentally ship without auth because middleware will not catch it.

**Evidence**

- `/api/*` is treated as public in [`middleware.ts:111`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/middleware.ts#L111) and therefore excluded from `isProtectedRoute` in [`middleware.ts:120`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/middleware.ts#L120).

**Recommendation**

Move to an explicit allowlist of truly public API routes, or add a middleware-level authenticated API default with narrow exceptions such as webhooks and health checks.

## Suggested Next Step

Prioritize AF-001 first. It closes the most important gap and provides a natural place to centralize AF-002 at the same time by introducing a single reusable privileged-mutation guard.

## Remediation Update (2026-02-28 Later)

AF-003 has since been remediated in middleware.

**What changed**

- `middleware.ts` now treats `/api/*` as authenticated by default instead of public by default.
- The only middleware-level public API exceptions are the routes that must remain anonymously reachable:
  - `/api/health`
  - `/api/billing/webhook`
  - `/api/gdpr/cron/retention`
- Unauthenticated requests to non-allowlisted API routes now receive a `401` JSON response from middleware instead of falling through to page-style redirect handling.
- Authenticated API requests no longer get redirected into onboarding flow by middleware; API traffic is allowed through to the route handler once session auth succeeds.

**Verification**

- `pnpm test __tests__/unit/middleware-api-auth.test.ts __tests__/unit/middleware-body-limit.test.ts __tests__/unit/middleware-health-rate-limit.test.ts __tests__/unit/health-route.test.ts`
  - Passed: `4` files, `9` tests, exit `0`
- `pnpm typecheck`
  - Passed: exit `0`

**Evidence**

- [`middleware.ts`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/middleware.ts)
- [`__tests__/unit/middleware-api-auth.test.ts`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/__tests__/unit/middleware-api-auth.test.ts)
- [`__tests__/unit/middleware-health-rate-limit.test.ts`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/__tests__/unit/middleware-health-rate-limit.test.ts)
- [`__tests__/unit/middleware-body-limit.test.ts`](/Users/jameswalsh/Dev/Web%20Projects/ComplyEur-v2/complyeur/__tests__/unit/middleware-body-limit.test.ts)
