# Engineering Audit 2026-06-15

Started: 2026-06-15 23:29 BST  
Branch: `codex/engineering-audit-and-hardening-2026-06-15`  
Scope: technical debt, architecture, dependency health, Supabase review, performance, loading/empty/error states, responsiveness, accessibility, tests, and documentation drift.

## Executive Summary

ComplyEur is in a solid pre-production posture for a regulated B2B SaaS: security controls are deliberate, RLS is consistently represented in migrations, and compliance logic has unusually strong test coverage. The largest remaining risks are not a single critical flaw but accumulation: broad client-component usage, large import/GDPR/email modules, noisy dead-code signals from underconfigured `knip`, and a heavy historical documentation set that can obscure current source-of-truth files.

This sprint made only low-risk hardening changes outside protected domains: shared empty/error state accessibility, mobile-safe action layouts, table minimum widths for dense operational tables, import-history pagination parsing, focused component tests, and transitive dependency security remediation.

Protected areas intentionally not modified: 90/180 calculation logic, forecasting engine logic, compliance thresholds, Schengen engine, Supabase RLS policies, auth/session architecture, Stripe/billing/pricing/entitlements, production configuration, secrets, legal claims, and core tenant security.

## Overall Ratings

| Area | Score | Rationale |
| --- | ---: | --- |
| Security | 8/10 | Strong RLS posture, security headers, security tests, and service-role discipline. Remaining work is verification freshness and avoiding stale historical findings. |
| Maintainability | 7/10 | Clear structure and standards, but several large modules and dormant barrels/components increase review cost. |
| Scalability | 7/10 | Index coverage exists for major tenant/date paths; import and export workflows need continued load profiling as customer data grows. |
| Testability | 8/10 | Strong compliance/security/import tests. UI state and route smoke coverage is improving but not yet comprehensive. |
| Performance | 7/10 | Router cache and image settings are present. Main risks are hydration breadth, large client components, and heavy import/export/email modules. |
| Documentation | 7/10 | `docs/README.md` gives a good authority model. Historical docs remain bulky and sometimes duplicate active docs. |
| Accessibility | 7/10 | Good primitives and route states exist; several decorative icons and dense tables needed polish. |
| Technical Debt | 6/10 | `knip:full` found 68 unused-file candidates and 243 unused-export candidates. Many are likely false positives, but this is enough to warrant a cleanup pass. |

## Critical Findings

None found in the audited scope. No production schema, auth, RLS, billing, pricing, or compliance-engine changes were made.

## High Priority Findings

1. `knip:full` reports 68 unused files and 243 unused exports, but `knip.json` has only `__tests__/utils/test-utils.tsx` as an entry. This makes the report noisy and likely misses real app/test entrypoints.
   - Evidence: `pnpm knip` passed for dependencies; `pnpm knip:full` failed with unused-file/export output and a root configuration hint.
   - Recommendation: add app, route, script, test, Playwright, and Supabase Edge Function entrypoints before deleting files.

2. Client-component breadth is high.
   - Evidence: 171 files under `app/` and `components/` contain `use client`; hotspots include `components/ui` (30), `components/import` (12), `components/settings` (11), `components/trips` (10), and `components/calendar` (8).
   - Risk: unnecessary hydration and larger client bundles.
   - Recommendation: review feature components for server/client boundary reduction. Keep UI primitives client-side where Radix/hooks require it.

3. Large modules concentrate change risk.
   - Evidence: `app/(dashboard)/import/actions.ts` (1068 lines), `components/onboarding/billing-onboarding-flow.tsx` (979), `lib/gdpr/dsar-export.ts` (932), `lib/exports/pdf-generator.tsx` (885), `lib/db/alerts.ts` (710), and `lib/services/email-service.ts` (1279).
   - Recommendation: only refactor with characterization tests. Do not split compliance, billing, or GDPR logic casually.

4. Historical documentation can conflict with current source-of-truth docs.
   - Evidence: large historical security/release docs remain active-path readable, including `docs/security/SAAS_SECURITY_AUDIT.md`, `docs/BETA_LAUNCH_RESULTS.md`, and `docs/operations/RELEASE-CHECKLIST.md`.
   - Recommendation: keep `docs/README.md` as authority and move/archive superseded material in a dedicated docs cleanup PR.

## Medium Findings

1. Dashboard and operational tables need consistent dense-data responsiveness.
   - Safe improvement applied to jobs and future-alerts tables with minimum table widths inside existing scrollable table primitive.

2. Empty and error states were present but lacked consistent accessible naming and decorative icon treatment.
   - Safe improvement applied to `components/ui/empty-state.tsx` and `components/ui/data-error.tsx`.

3. Import-history pagination accepted invalid `page` query values into `NaN`.
   - Safe improvement applied by coercing invalid page values to `1`.

4. Database review shows broad RLS/index coverage but no live usage/index selectivity evidence.
   - Evidence: 35 migration files; base schema and hardening migrations enable RLS across tenant tables and add indexes for alerts, audit logs, imports, employees, trips, jobs, billing, and invites.
   - Recommendation: run query-plan review against staging-size data before adding/removing indexes.

5. Documentation TODO markers remain in SOC 2 evidence placeholders and historical security docs.
   - Evidence: `docs/compliance/soc2/EVIDENCE_INDEX.md`, `docs/compliance/soc2/GAPS.md`, and `docs/security/GAP_ANALYSIS.md`.
   - Recommendation: replace placeholders with current evidence links or mark as historical.

## Low Findings

1. Duplicate document names exist across subtrees (`README.md`, `ENVIRONMENTS.md`, `2026-05-18-exports-split-panel-redesign.md`), which is acceptable but makes search results noisy.
2. Several `index.ts` barrels are flagged by `knip:full`; do not delete until entrypoints are corrected.
3. Old design variants under `design/landing-variants/` are likely archive candidates, not production code.
4. `pnpm install --frozen-lockfile` prompted interactively; `CI=true pnpm install --frozen-lockfile` was required for deterministic audit execution.
5. CI-mode install noted ignored build scripts for `esbuild`; document whether this is expected for local installs.

## Technical Debt Register

### Critical

None verified.

### High

- `knip` entrypoint configuration is too narrow for deletion confidence.
- Large modules in import, GDPR export, email, onboarding, and database access should be split only behind tests.
- Documentation sprawl makes stale security/release claims discoverable beside current authority.

### Medium

- Client-component density should be reduced incrementally.
- Barrel files and dormant components need a configured dead-code cleanup pass.
- Import/export UI has many bespoke state renderings; shared primitives should be used where practical.
- Historical Jest files exist while the active runner is Vitest.

### Low

- Duplicate doc filenames make search noisy.
- Some loading skeletons use simple pulse blocks rather than shared skeleton primitives.
- Several decorative icons lacked `aria-hidden`; partially fixed in this sprint.

## Dependency And Package Audit

- `pnpm knip`: passed with no dependency findings.
- `pnpm knip:full`: failed with unused files/exports and configuration hint.
- Initial `pnpm security:check`: failed with 8 transitive vulnerabilities across Vite, js-yaml, OpenTelemetry, and Babel.
- Remediation applied: tightened `pnpm.overrides`, updated `vitest` and `@vitest/coverage-v8` to 4.1.9, and added explicit `vite@^8.0.16` as the Vitest peer.
- Final `pnpm security:check`: passed with no known vulnerabilities.
- No packages were removed. The unused-file/export report is not safe enough for removal until `knip.json` is refined.
- No `depcheck` command was found in `package.json`; `knip` is the configured tool.

## Next.js Architecture Audit

- App Router route-level loading/error coverage exists for dashboard, import, calendar, settings, employee detail, admin, and future alerts.
- Client boundaries are broad. Highest-value reviews are feature components that import browser-only hooks for small interactions.
- Preview/landing variants are isolated but add codebase mass and should be archived once the active marketing path is confirmed.
- Safe improvements applied to table responsiveness and query parsing only.

## Database And Supabase Review

- Schema has RLS enabled across core tables in the base migration and follow-up hardening migrations.
- Indexes exist for major company/date/status paths: employees, trips, alerts, audit logs, import sessions, notification logs, jobs, billing events, feedback, invites, and team/admin data.
- No schema changes were made.
- Recommended next step: run `EXPLAIN` on staging-size dashboard, future alerts, import history, GDPR export, and jobs queries before modifying indexes.

## Performance Findings

- Main performance risk is hydration breadth, not obvious missing indexes.
- Large client or mixed modules: onboarding billing flow, import upload/preview, calendar/trips, export PDF generation, and marketing preview pages.
- Router cache and image format settings are already configured in `next.config.ts`.
- Recommendation: run `ANALYZE=true pnpm build` and inspect route chunks before removing dependencies or moving boundaries.

## Accessibility Findings

- Shared empty/error states now have accessible naming/description and decorative icons hidden from assistive tech.
- Operational tables now enforce minimum widths to preserve readability inside the existing horizontal scroll container.
- Future work: add route-level axe checks for dashboard, import, exports, jobs, and settings pages.

## Safe Improvements Completed

- `components/ui/empty-state.tsx`: accessible labelled/described state and mobile action layout.
- `components/ui/data-error.tsx`: named alert, described alert, decorative icon hiding, mobile action layout.
- `app/(dashboard)/jobs/page.tsx`: decorative icon hiding and dense table minimum width.
- `components/forecasting/future-alerts-table.tsx`: dense table minimum width and decorative flag hiding.
- `components/forecasting/future-alerts-empty.tsx`: decorative icon hiding and correct `Button asChild` usage.
- `app/(dashboard)/settings/import-history/page.tsx`: invalid page query fallback and mobile header layout.
- `app/(dashboard)/settings/import-history/import-history-list.tsx`: mobile card/pagination layout and decorative icon hiding.
- `__tests__/components/ui-state.test.tsx`: coverage for empty, search-empty, data-error, and inline-error states.
- `package.json` and `pnpm-lock.yaml`: patched transitive security findings for Vite, js-yaml, OpenTelemetry, and Babel paths.

## Verification Results

| Check | Result |
| --- | --- |
| `CI=true pnpm install --frozen-lockfile` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test __tests__/components/ui-state.test.tsx` | Pass, 4 tests |
| `pnpm test` | Fail: 2 calendar breach-day expectation failures in protected calendar/compliance behavior; 2122 tests passed |
| `pnpm build` | Pass |
| `pnpm security:check` | Pass after dependency remediation |
| `pnpm test:e2e` | Blocked by invalid/missing seeded auth credentials; stopped after repeated auth failures |
| `pnpm test:e2e:a11y` | Pass for 10 public checks; 7 authenticated checks skipped due missing credentials |

## Risk Areas Intentionally Avoided

- Compliance calculation logic and date/window algorithms.
- Forecasting service logic and risk thresholds.
- Supabase RLS policy definitions and schema migrations.
- Authentication/session architecture.
- Stripe, billing, pricing, entitlements, and subscription logic.
- Production environment configuration and secrets.
- Legal/compliance product claims.

## Recommended Next Human Actions

1. Expand `knip.json` entrypoints and rerun `pnpm knip:full` before deleting any reported files.
2. Decide whether historical docs should move to an archive subtree or be explicitly marked historical in-place.
3. Run bundle analysis and route-level axe checks after CI is green.
4. Review large import/GDPR/email modules with characterization tests before refactoring.
5. Use staging-size data to profile dashboard, future alerts, import history, jobs, and GDPR export queries.
