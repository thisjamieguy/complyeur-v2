# Overnight Maintenance Audit - 2026-06-16

## Scope

Requested maintenance pass while the user is away:

- Check baseline code health.
- Look for bloat, dead code, dependency drift, and oversized files.
- Review documentation freshness and internal consistency.
- Finish, polish, or harden clear low-risk items.

## Guardrails

- Source of truth follows `AGENTS.md`: repo code, migrations, and config first; tests and evidence second; current docs third; historical memory last.
- No commits unless explicitly requested.
- No deletion/removal of code or docs without clear evidence and user approval.
- Low-risk edits only, followed by targeted verification.

## Running Log

- Created audit report.
- `git status --short --branch` showed branch `codex/dpa-check...origin/codex/dpa-check` with no short-status file changes before this report was created.
- Read `package.json`, `docs/README.md`, and `docs/engineering/README.md` for script inventory and documentation authority model.
- Generic code-review skill referenced extra `.claude/skills/shared/*` protocol files, but those files were not present in this repo or installed skill path according to `rg --files`.

## Baseline Verification

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- Initial `pnpm test`: failed because Vitest discovered tests under `.claude/worktrees/silly-hamilton-c3a937`, and the service-role allowlist scanner also traversed that agent worktree.
- Targeted fix: excluded `.claude` from Vitest discovery and from the service-role allowlist directory walker.
- `pnpm vitest run __tests__/unit/security/service-role-allowlist.test.ts`: passed after the fix.
- `pnpm test`: passed after the fix. Result: 142 test files passed, 2,144 tests passed.
- `pnpm build`: passed. Next.js 16.2.6 compiled successfully and generated 48 static pages; build emitted one warning that edge runtime disables static generation for the affected page.
- `pnpm security:check`: passed; `pnpm audit` reported no known vulnerabilities.
- Final verification after all edits:
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed.
  - `pnpm knip`: passed.
  - `pnpm test`: passed, 142 files and 2,144 tests.
  - `pnpm build`: passed.
  - `pnpm security:check`: passed; no known vulnerabilities.

## Bloat Scan

- `pnpm knip`: initially failed with unlisted direct dependency `@next/env` in three billing/Stripe scripts:
  - `scripts/auditStripePriceIds.ts`
  - `scripts/configureStripeWebhook.ts`
  - `scripts/syncStripePrices.ts`
- Added direct dependency `@next/env@16.2.6` to `package.json` and refreshed `pnpm-lock.yaml` offline.
- `pnpm knip`: passed after dependency metadata fix.
- Large-file scan, excluding dependency/build/agent-worktree folders, found expected high-line-count files including `types/database.ts`, large import/compliance tests, `lib/services/email-service.ts`, `lib/gdpr/dsar-export.ts`, and old audit/planning docs. Size alone is not safe removal evidence.
- TODO/FIXME/HACK scan found no source-code TODO/FIXME/HACK markers outside docs/agent command text; remaining markers are documentation placeholders or historical/audit references.
- `pnpm knip:full`: still not deletion-grade. It reports 67 unused-file candidates, 243 unused-export candidates, and the configuration hint: add/refine `knip.json` entry/project files. This should be handled by a dedicated cleanup pass before deleting anything.

## Documentation Freshness

- Read current documentation authority map and June 15 audit/status docs:
  - `docs/README.md`
  - `docs/audits/ENGINEERING_AUDIT_2026-06-15.md`
  - `docs/audits/DOCUMENTATION_AUDIT_2026-06-15.md`
  - `docs/overnight-hardening/OVERNIGHT_HARDENING_STATUS.md`
- Found stale verification status in June 15 docs: they still described full Vitest as blocked by calendar breach-day expectations. The current failure source was `.claude/worktrees` discovery pollution, and full Vitest now passes.
- Updated:
  - `docs/audits/ENGINEERING_AUDIT_2026-06-15.md` verification row for `pnpm test`.
  - `docs/overnight-hardening/OVERNIGHT_HARDENING_STATUS.md` with a dated 2026-06-16 follow-up section.
- Ran a docs internal-link check over 153 Markdown files.
  - Initial candidates: 67.
  - Safe fixes applied:
    - `docs/AGENT.md`: corrected root `agent/...` links to `../agent/...`.
    - `docs/security/rls-audit/03-rls-audit-report.md`: corrected nested links to root source/migration/test files and angle-bracketed `app/(dashboard)` targets.
    - `docs/security/2026-02-28-authz-followup-audit.md`: converted absolute local filesystem links to relative repo links, angle-bracketed `app/(dashboard)` links, and updated stale `middleware.ts` evidence links to current `proxy.ts`.
  - Final improved filesystem-link check: 153 Markdown files checked, 0 missing internal filesystem links.

## Fixes Applied

- Hardened test discovery against agent worktree residue:
  - `vitest.config.ts`: added `.claude` to `test.exclude`.
  - `__tests__/unit/security/service-role-allowlist.test.ts`: added `.claude` to skipped directories.
- Declared `@next/env@16.2.6` as a direct dependency because billing scripts import it directly.
- Fixed documentation freshness/link issues:
  - Updated June 15 audit/status docs with the 2026-06-16 full Vitest follow-up.
  - Fixed broken relative docs links in `docs/AGENT.md`.
  - Fixed broken root-source links in `docs/security/rls-audit/03-rls-audit-report.md`.
  - Replaced machine-specific absolute links in `docs/security/2026-02-28-authz-followup-audit.md`.

## Outcome

- Core health is green: typecheck, lint, dependency-only Knip, full Vitest, build, and security audit all pass.
- The initial full-test failure was not a compliance/calendar regression; it was caused by `.claude/worktrees` being discovered by Vitest and by the service-role allowlist source walker.
- Documentation filesystem links are clean across 153 Markdown files.
- `pnpm knip:full` remains a backlog item, not an automatic cleanup target. It needs a dedicated entrypoint configuration pass before any deletion work.

## Continued App-Wide Audit

- Route/test inventory reviewed:
  - `playwright.config.ts`
  - `e2e/`
  - `app/**/{page,route,actions,loading,error}.tsx?`
- `pnpm test:e2e:baseline`:
  - Sandboxed run failed to bind `127.0.0.1:3100` with `EPERM`.
  - Escalated rerun passed executable coverage: 25 passed, 24 skipped.
  - Skips were due missing `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`; Playwright auth setup reported auth setup skipped.
  - Web server emitted repeated Sentry/OpenTelemetry `require-in-the-middle` static extraction warnings and browser image aspect-ratio warnings for ComplyEur SVG logos.
- `pnpm test:e2e:a11y`: 10 passed, 7 skipped due missing auth credentials.
- `pnpm test:e2e:mobile`: 4 passed, 11 skipped due missing auth credentials.
- `pnpm playwright test e2e/a11y.spec.ts --grep "a11y: /login|a11y: /signup"`: 2 passed after logo sizing fixes; the ComplyEur SVG aspect-ratio warning did not recur in the targeted output.
- `pnpm test:e2e:import`: 15 skipped. Each case attempted auth and hit the unavailable local Supabase auth endpoint before the test skip path completed.
- `pnpm test:e2e:dashboard`: 19 skipped for the same missing local auth prerequisite.

## Continued Security/Data Audit

- Targeted security/GDPR/billing tests passed:
  - `pnpm vitest run __tests__/unit/api-route-auth-review.test.ts __tests__/unit/security/service-role-allowlist.test.ts __tests__/unit/billing/webhook.test.ts __tests__/unit/billing/routes.test.ts __tests__/unit/gdpr __tests__/unit/actions/bulk-delete-security.test.ts __tests__/unit/actions/team-security.test.ts`
  - Result: 11 files passed, 33 tests passed.
- Migration RLS sanity check: 29 created public tables and 29 `ENABLE ROW LEVEL SECURITY` statements, with no missing table after excluding a false positive from a trigger string.
- Confirmed existing fail-closed cron auth wrapper use on billing, onboarding, beta-monitoring, internal health, and GDPR retention cron routes.
- Confirmed Stripe webhook route checks `stripe-signature`, content type, body presence, payload size, signature verification, duplicate event claiming, stale processing reclaim, and processing status updates.
- Service-role usage remains explicit and guarded by the allowlist test.

## Continued Hardening Fixes

- Fixed Next/Image SVG aspect-ratio warnings:
  - `app/(auth)/layout.tsx`: paired auto width/height style on stacked logo.
  - `app/(onboarding)/layout.tsx`: paired auto width/height style on stacked logo.
  - `components/layout/footer.tsx`: explicit `h-5 w-5` icon size.
- Removed several native `Date` parses from date-only logic:
  - `lib/db/trips.ts`: bulk trip date validation now uses `YYYY-MM-DD` pattern and lexical date ordering.
  - `app/actions/exports.ts`: trip sorting now uses lexical `YYYY-MM-DD` comparison.
  - `lib/validations/exports.ts`: export date validation uses `parseDateOnlyAsUTC`; range comparison uses lexical date ordering.
  - `lib/validations/trip-overlap.ts`: overlap detection uses date-only string comparison.
  - `app/(dashboard)/future-job-alerts/page.tsx`: future-trip filtering uses `parseDateOnlyAsUTC` and `toUTCMidnight`.
- Targeted date-hardening verification:
  - `pnpm vitest run __tests__/unit/validations/exports-validation.test.ts __tests__/unit/validations/trip-overlap.test.ts __tests__/integration/trips-api.test.ts`: 3 files passed, 72 tests passed.
  - `pnpm vitest run __tests__/components/trip-forecast-calculator.test.tsx lib/services/__tests__/forecast-service.test.ts`: 2 files passed, 9 tests passed.

## Final Verification - Continued Pass

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm knip`: passed.
- Docs/plans internal-link check: 155 Markdown files checked, 0 missing internal filesystem links.
- First `pnpm test` rerun after the continued fixes had one transient failure in `__tests__/components/mfa-enrollment.test.tsx`.
  - `pnpm vitest run __tests__/components/mfa-enrollment.test.tsx`: passed immediately afterward.
  - Fresh full rerun `pnpm test`: passed, 142 files and 2,144 tests.
- `pnpm build`: passed. Next.js 16.2.6 compiled successfully and generated 48 static pages; build still emits the known edge-runtime static-generation warning.
- `pnpm security:check`: passed; `pnpm audit` reported no known vulnerabilities.
