# Multi-User Public Release Audit

Date: 2026-06-24
Scope: Review Claude's multi-user account audit against the current repository and decide whether more work is needed before public release.

## Verdict

The multi-user account implementation is locally release-ready from a code and
test perspective after this hardening pass. I would not call the overall product
public-release ready until the remaining external/legal gates in
`docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md` are closed.

The original Claude audit was directionally right: the team security model is
strong, and the most visible multi-user flaw was the non-admin Team page UX. That
UX flaw is now fixed.

## Closed In This Pass

- Non-owner/admin users no longer click through to a red "Forbidden" Team page.
  The Workspace settings page now shows a non-clickable Team access explainer for
  roles without `PERMISSIONS.USERS_VIEW`, and `/settings/team` renders a friendly
  access state if directly visited.
- Employee DSAR ZIPs now include `dsar_manifest.json`, and `metadata.json`
  includes the same machine-readable manifest. The manifest records included
  stores, account-level manual stores, processor/external stores, and documented
  retention limitations.
- The public privacy provider list and DPA sub-processor list now include
  CookieYes, Cloudflare Turnstile, and Upstash Redis.
- GDPR release documentation now includes an Article 30 processing record,
  DSR operating process, retention schedule, processor/subprocessor register,
  DPIA trigger checklist, and LIA template.
- Vitest no longer discovers ignored local agent caches via config, and the
  service-role allowlist scanner ignores `.agents`, `.claude`, and `.codex`
  directories.
- Calendar tests now match the current compliance rule: 90 days is red/exhausted,
  while breach starts at 91 days.

## What Looks Strong

- Team actions use server-side guards before writes. Reads require
  `PERMISSIONS.USERS_VIEW`; mutations require the relevant mutation permission or
  owner-only guard.
- Roles are centralized in `lib/permissions.ts`. Owners/admins have user
  management permissions; managers/viewers do not.
- Invite creation normalizes email, blocks self-invites, validates roles, checks
  seats, revokes rows when email dispatch fails, and logs successful actions.
- Ownership transfer uses the authenticated client and a hardened RPC.
- Current migrations harden direct RPC calls by binding sensitive operations to
  `auth.uid()` and authenticated profile/company context.
- Full local Vitest, typecheck, lint, production build, and dependency audit are
  green.

## Remaining Release Gates

### Production tenant/RLS evidence

The code and migration source look good, and a fresh production Supabase
attack-test run now exists for the current schema.

Evidence:
- `docs/operations/evidence/multi-user-e2e/2026-06-24-production-rls-rpc-attack-probe.md`
- Direct cross-tenant employee/trip reads returned zero rows.
- Direct cross-tenant trip update and alert delete returned zero rows.
- Cross-tenant employee/trip inserts were rejected by RLS.
- Viewer invite read/update was denied.
- Direct RPC misuse checks were denied for `get_company_seat_usage`,
  `get_company_user_limit`, and `transfer_company_ownership`.
- Owner positive-control read still worked.

Local status: `pnpm test:e2e:multi-user` passed locally with 2 Playwright tests
after local Supabase was available at `http://127.0.0.1:54321`.

### Legal/provider/privacy sign-off

Engineering documentation is now in place, but public release still requires:
- Legal review of the DPA template before external use.
- Provider role, DPA/SCC/UK transfer, region, and retention confirmation for
  Supabase, Vercel, Stripe, Resend, Sentry, GA4, CookieYes, Cloudflare Turnstile,
  and Upstash.
- Lawful-basis review and ICO registration evidence where applicable.
- Production cookie scan and evidence that CookieYes reject/withdraw paths block
  GA cookies/scripts/events.

### Broader launch operations

The release source of truth still tracks non-multi-user launch gates, including
Stripe lifecycle/replay evidence, DNS email authentication, recovery drill
evidence, Sentry alert routing, public/internal health evidence, and real-device
browser checks.

## Verification Run

Passed:

```bash
pnpm exec vitest run --dir __tests__ unit/actions/team-security.test.ts unit/actions/team-actions-full.test.ts unit/actions/onboarding-team-invites.test.ts unit/permissions/team-permissions.test.ts unit/security/phase3-rls-rpc-hardening.test.ts unit/security/mfa-role-enforcement.test.ts unit/gdpr unit/actions/gdpr-security.test.ts unit/security/dsar-export-auth.test.ts components/consent-aware-google-analytics.test.tsx components/analytics-client.test.tsx
# 15 files passed, 160 tests passed

pnpm exec vitest run __tests__/unit/security/service-role-allowlist.test.ts components/calendar/__tests__/calendar-view.helpers.test.ts components/calendar/__tests__/calendar-view.test.tsx __tests__/components/mfa-enrollment.test.tsx
# 4 files passed, 11 tests passed

pnpm test
# 147 files passed, 2144 tests passed

pnpm test:e2e:multi-user
# 2 passed (1.1m)

CONFIRM_PRODUCTION_SUPABASE_RLS_PROBE=true pnpm exec tsx scripts/security/production-rls-attack-probe.ts
# Production Supabase RLS/RPC probe passed 13 checks; cleanup verified

pnpm typecheck
pnpm lint
pnpm build
pnpm security:check
```
