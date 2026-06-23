# Public Release Source Of Truth

## Status

**Authoritative.** This document is the current source of truth for ComplyEur
public paid-release readiness.

- Use this file for current readiness status, blockers, findings, owners, and
  next actions.
- Use `docs/release/PUBLIC_RELEASE_CHECKLIST.md` for the detailed exit
  checklist.
- Treat older beta launch checklists and historical audits as supporting
  evidence only.

Last updated: 2026-06-18
Audit mode: repository review plus local verification where runnable
Baseline under review: working tree on 2026-06-18

## 1. Executive Summary

ComplyEur is not yet ready for a public paid release, but the repository-side
product core is materially closer to that bar than the remaining beta blocker
count suggests. The deterministic Schengen engine, import/privacy/security test
coverage, auth/session guards, cron protection, webhook idempotency patterns,
and release documentation structure are all in relatively strong shape.

The biggest remaining gaps are operational and legal rather than purely
algorithmic: restore/PITR evidence, public-release legal/privacy approval and
processor evidence, and live auth email/password-reset/onboarding verification.
Repo-side hardening still matters, but it is secondary to those launch gates.

Current posture: **NO-GO for public paid release**

Shortest credible path: **3 gates, 7 exit items**

## 2. Section Status

| Area | Status | Notes |
| --- | --- | --- |
| Release governance and evidence | Conditional | Public-release checklist and source-of-truth now exist; historical docs still need clearer quarantine and public-release decision flow. |
| Core compliance correctness | Ready at repo level | `pnpm test:compliance` passed with 493 tests; rolling-window/date-aware country logic remains centralized in `lib/compliance/`. |
| Import and data quality | Conditional | Import-focused tests passed with 299 tests; workbook caps and privacy sanitization are strong. Native date parsing fallback in `lib/import/parser.ts` was removed on 2026-06-18. |
| Auth and session security | Conditional | Auth actions, rate limiting, MFA enforcement, cron auth, and consent gating are implemented and covered, but live public-release email/password-reset evidence is still missing. |
| Authorization and tenant isolation | Conditional | Role guards and tenant/RLS tests are strong, but fresh cross-tenant write/delete/export evidence is still required before public release. |
| Privacy, GDPR, and legal readiness | Blocked | DSAR and consent tests are strong, but retention/legal/account-level processor evidence and formal approval remain open. |
| Billing and paid-customer readiness | Conditional | Production webhook wiring plus production-like lifecycle/replay/reconciliation evidence are now captured; this area is no longer a direct public-release blocker. |
| App security hardening | Conditional | Security tests and controls are strong; CSP still relies on `'unsafe-inline'`, and GitHub/dashboard enforcement evidence remains external. |
| UI, UX, accessibility, and manual coverage | Conditional | Public/auth/core route coverage is documented; onboarding, privileged/admin, import-failure, and real-device gaps remain. |
| Tech debt, code bloat, and maintainability | Warn | `pnpm knip:full` still reports 67 unused files and 243 unused exports, but `knip.json` is underconfigured and the report is not yet deletion-safe. |
| Operations, monitoring, and recovery | Blocked | Restore/PITR evidence remains open. Monitoring first-run evidence is now captured in production and alert-path verification is recorded in a production-like environment. |

## 3. Tighter Path To Public Release

The shortest credible path is not "fix everything." It is clearing the narrow
set of release gates that still block trust, recovery, revenue, and legal
readiness.

### Gate 1. Recovery And Data Durability

Exit items:

1. Enable production backup/PITR coverage.
2. Run the documented restore procedure against an isolated target and record
   the result.

Why this gate is first:

- Without it, paid-customer recovery is still operating under an initial-tester
  risk acceptance only.
- It blocks broader rollout confidence even if product code remains stable.

Evidence:

- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/operations/evidence/EVIDENCE_STATUS.md`
- `docs/RUNBOOK.md`

### Gate 2. Transactional Trust And Onboarding

Exit items:

3. Configure and verify SPF/DKIM/DMARC with passing delivered headers.
4. Verify multi-provider signup email delivery across Gmail, Outlook, and one
   corporate inbox.
5. Verify password-reset delivery, link behavior, expiry, and post-reset
   session behavior.
6. Verify a non-founder full journey from signup through protected app access.

Why this gate is second:

- Public release cannot tolerate broken signup or recovery flows.
- Deliverability and reset behavior are user-trust issues, not optional polish.

Evidence:

- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/operations/evidence/EVIDENCE_STATUS.md`
- `docs/operations/evidence/password-reset/2026-06-17-password-reset-delivery-failure.md`

### Gate 3. Legal And Privacy Sign-Off

Exit items:

7. Close the public-release legal package: DPA approval, GDPR/provider-account
   evidence, processor/subprocessor proof, and the ICO/registration position.

Why this gate is last:

- This is a hard ship/no-ship gate, but most of the remaining work depends on
  attaching the operational evidence generated by Gates 1-2 and the now-captured
  billing/monitoring evidence.
- The repo cannot self-complete this gate without account-level and legal-owner
  action.

Evidence:

- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
- `docs/legal/DPA_READINESS.md`
- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`

## 4. Exact Blocker Count

Current direct public-release exit items: **7**

- Recovery/durability: 2
- Transactional trust/onboarding: 4
- Legal/privacy sign-off: 1 release package containing multiple evidence
  attachments

Current blocker shape:

- Repo-only code blockers: **0 confirmed P0 blockers**
- Repo-plus-operations blockers: **2**
- External/manual/account-level blockers: **5**

Interpretation:

- The codebase is not hiding a second large engineering backlog for public
  launch.
- The remaining path is primarily evidence, operations, third-party account
  configuration, and legal sign-off.

## 5. Findings Ledger

### P0 Release Blockers

- No current restore-drill or PITR evidence exists for broader paid/public rollout.
  Evidence: `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`, `docs/RUNBOOK.md`, `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`
- Legal/DPA/provider-account evidence and approval are still incomplete for public release.
  Evidence: `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`, `docs/legal/DPA_READINESS.md`, `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- Live multi-provider auth delivery, password reset, and non-founder onboarding verification remain open.
  Evidence: `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`

### P1 Required Before Public Release

- Release docs currently assign blocker ownership by role, but not by named
  individual. That is a coordination risk for a short release push.
  Evidence: `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `knip:full` is not yet a trustworthy dead-code signal because `knip.json` only declares `__tests__/utils/test-utils.tsx` as an entrypoint.
  Evidence: `knip.json`, `pnpm knip:full`
- Supporting SOC2 docs still required cleanup for release use. The raw TODO section markers in `docs/compliance/soc2/EVIDENCE_INDEX.md` and `docs/compliance/soc2/GAPS.md` were replaced with maintenance-note framing on 2026-06-18.
- Fresh cross-tenant write/delete/export evidence is still not recorded in the current release source-of-truth.
  Evidence: `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`, `e2e/multi-user-isolation.spec.ts`
- Privileged/admin/onboarding/import-failure/manual-mobile coverage is still thinner than the public/auth/core path coverage.
  Evidence: `docs/testing/e2e-page-coverage.md`

### P2 Hardening And Follow-Up

- 2026-06-18 production webhook wiring, production monitoring first-run
  evidence, and production-like Stripe lifecycle/replay/reconciliation evidence
  were captured. This removed billing/monitoring from the direct public-release
  blocker set.
- The payment-failed webhook path previously tried to read
  `companies.email`, which is not present in the repo schema. On 2026-06-18 it
  was corrected to resolve the billing recipient from company profiles instead.
- The billing webhook now persists the latest applied Stripe event timestamp and
  ignores older lifecycle events so stale `customer.subscription.updated` or
  `customer.subscription.deleted` webhooks cannot overwrite fresher entitlement
  state. Production-like Stripe evidence now exists for the end-to-end path.
- The import parser previously retained a native `new Date(value)` fallback in `lib/import/parser.ts`; this was removed on 2026-06-18 in favor of the structured import date parser.
- The core compliance engine still contains a few safe-but-inconsistent date literals such as the epoch default in `lib/compliance/constants.ts`; the default was normalized to an explicit UTC timestamp on 2026-06-18.
- CSP still relies on `'unsafe-inline'` because of CookieYes and several runtime styling dependencies.
  Evidence: `lib/security/csp.ts`
- The codebase remains large and hydration-heavy in places.
  Evidence: 175 `use client` files; large modules include `lib/services/email-service.ts` (1413 lines), `lib/gdpr/dsar-export.ts` (1092), `app/(dashboard)/import/actions.ts` (1068), and `components/onboarding/billing-onboarding-flow.tsx` (979).
- Dormant or not-yet-enabled code still exists, notably `lib/services/background-jobs.ts`, which is hard-disabled with `BACKGROUND_JOBS_ENABLED = false`.

## 6. Recommended Sequence

1. Close Gate 1 first: enable PITR/backups, then run and record the restore
   drill.
2. In parallel, close Gate 2: fix DNS/email trust first, then re-run signup,
   password-reset, and non-founder journey checks.
3. Use the evidence from Gates 1-2 plus the now-complete billing/monitoring
   package to close Gate 3 and obtain the final
   legal/privacy release sign-off.

Parallelization note:

- Gates 1 and 2 can run in parallel.
- Gate 3 should prepare in parallel but cannot finish cleanly until the earlier
  evidence is attached.

## 7. Verification Log

- `pnpm test:compliance` — passed, 13 files / 493 tests
- `pnpm exec vitest run __tests__/unit/gdpr __tests__/unit/actions/gdpr-security.test.ts __tests__/unit/security/dsar-export-auth.test.ts` — passed, 7 files / 14 tests
- `pnpm exec vitest run __tests__/unit/security __tests__/unit/actions/team-security.test.ts __tests__/unit/actions/bulk-delete-security.test.ts` — passed, 13 files / 58 tests
- `pnpm exec vitest run __tests__/unit/import lib/import/__tests__` — passed, 12 files / 299 tests
- `pnpm exec vitest run __tests__/components/consent-aware-google-analytics.test.tsx __tests__/components/analytics-client.test.tsx` — passed, 2 files / 7 tests
- `pnpm security:check` — passed, no known vulnerabilities
- `pnpm build` — passed; Next.js 16.2.6 production build generated 48 static pages/routes in this environment
- `pnpm typecheck` — exited successfully during audit
- `pnpm lint` — exited successfully during audit
- `pnpm knip` — exited successfully during audit
- `pnpm beta:monitoring:check -- --self-test` — passed; helper is wired and can generate a monitoring evidence note when production secrets are available
- `pnpm billing:webhook:check` with production Stripe env — passed; live endpoint configuration verified for `https://complyeur.com/api/billing/webhook`
- `pnpm beta:monitoring:check -- --base-url https://complyeur.com` with production `CRON_SECRET` — passed; HTTP 200 and no-alert first-run evidence written to `docs/operations/evidence/2026-06-18-beta-monitoring-first-run.md`
- `supabase migration repair --local --status reverted 20260601213000` and `supabase db push --local` — completed to align the local production-like billing evidence environment with current repo migrations
- `pnpm test __tests__/unit/billing/webhook-payment-failed.test.ts` — passed; payment-failed recipient lookup now resolves from company profiles
- `pnpm tsx scripts/billing/captureStripeLifecycleEvidence.ts --base-url http://127.0.0.1:3100` — passed; wrote `docs/operations/evidence/stripe-verification/2026-06-18-stripe-lifecycle-replay-reconciliation-testmode.md`
- `pnpm knip:full` — failed with 67 unused-file candidates and 243 unused-export candidates; configuration hint points at under-scoped `knip.json`
- `pnpm test:e2e:baseline` — attempted but environment-blocked; Playwright could not start the local web server because binding `127.0.0.1:3100` returned `EPERM` in the sandbox

## 8. Supporting Documents

- `docs/release/PUBLIC_RELEASE_CHECKLIST.md`
- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
