# Infrastructure 9/10 Audit - 2026-06-15

## Scope

This audit covers the application foundations visible from the repository on
branch `codex/infrastructure-audit-2026-06-15`: compliance logic, auth and
authorization guardrails, RLS-facing service boundaries, CI/security gates,
operations runbooks, billing lifecycle controls, imports, GDPR retention, and
documentation governance.

Scores below distinguish repository-verifiable controls from external
dashboard evidence. A category is not marked release-ready 9/10 unless code,
tests, CI, and dated operational evidence exist.

## External Source Check

Schengen source review on 2026-06-15 confirmed the European Commission guidance
that short stays are up to 90 days in a 180-day period, and that Bulgaria and
Romania joined Schengen fully on 1 January 2025 while Cyprus remains in the
integration process and Ireland opts out.

Source: https://home-affairs.ec.europa.eu/policies/schengen/schengen-area_en

## Expert Team Scores

| Expert | Ownership | Repo-verified score | Release evidence score | Status |
|---|---|---:|---:|---|
| AppSec Principal, 20+ yrs | Auth, MFA, CSP, CSRF, service-role use | 9.0 | 8.3 | Repo controls added; CSP enforcement and alert evidence pending |
| Supabase/RLS Architect, 20+ yrs | RLS, tenant isolation, policy evidence | 9.0 | 8.5 | Service-role allowlist and health split added; fresh RLS attack evidence pending |
| SRE/DR Lead, 20+ yrs | Monitoring, alerts, backups, restore drills | 8.2 | 6.8 | Runbooks improved; Sentry and restore evidence pending |
| CI/Supply Chain Lead, 20+ yrs | CodeQL, Dependabot, audit gates, branch protection | 9.0 | 7.8 | Workflows added; GitHub run and branch protection evidence pending |
| Schengen Domain Lead, 20+ yrs | 90/180 rules, countries, date correctness | 9.3 | 9.1 | Boundary and country-source fixes verified by compliance tests |
| Billing/Stripe Lead, 20+ yrs | Checkout, portal, webhook lifecycle, evidence | 9.0 | 7.9 | Permission and invariant controls added; live lifecycle evidence pending |
| GDPR/Data Protection Lead, 20+ yrs | DSAR, retention, deletion, privacy evidence | 8.8 | 7.6 | Import raw-PII retention improved; full DSAR and backup limitation evidence pending |
| Documentation Governance Lead, 20+ yrs | Source of truth, stale docs, evidence index | 9.0 | 8.6 | Core docs updated; external evidence links must be attached as produced |

## Implemented Repository Controls

- Compliance engine treats exactly 90 days as exhausted but compliant; breach
  begins at more than 90 days.
- Import and compliance country handling now uses the centralized Schengen
  country source for Bulgaria, Romania, Ireland, Cyprus, and microstates.
- Billing checkout and portal mutations require `PERMISSIONS.BILLING_MANAGE`.
- Stripe API version is pinned; checkout reuses existing Stripe customer IDs
  and sends company/user/plan metadata.
- Stripe checkout completion validates required metadata and customer/company
  invariants before entitlement changes.
- Mutating requests are guarded by centralized Origin and Sec-Fetch validation.
- Production Turnstile behavior fails closed while non-production bypass remains
  explicit.
- Public `/api/health` uses anonymous `ping()` only; protected deep health lives
  at `/api/internal/health`.
- A static service-role allowlist test covers `createAdminClient()` call sites.
- `.github/workflows/security.yml`, `.github/workflows/codeql.yml`, and
  `.github/dependabot.yml` add dependency/security scanning coverage.
- XLSX import parsing now rejects excessive worksheets, hidden first sheets,
  excessive columns, excessive rows, and excessive cells.
- Import-session retention cleanup covers pending, parsing, validating, ready,
  importing, completed, and failed raw-PII states.

## Verification Completed

| Check | Result | Date |
|---|---|---|
| `pnpm typecheck` | Passed | 2026-06-15 |
| `pnpm lint` | Passed | 2026-06-15 |
| `pnpm test:compliance` | 13 files passed, 482 tests passed | 2026-06-15 |
| `pnpm test:unit` | 100 files passed, 1530 tests passed | 2026-06-15 |
| `pnpm test:integration` | 6 files passed, 187 tests passed | 2026-06-15 |
| `pnpm build` | Passed, 47 static pages generated | 2026-06-15 |
| `pnpm security:check` | Passed, no known vulnerabilities | 2026-06-15 |
| `pnpm test:e2e:multi-user` | Command exited 0, but 2 tests were skipped because local Supabase was not reachable at `127.0.0.1:54321` | 2026-06-15 |
| `pnpm test:e2e:import` | Command exited 0, but 15 tests were skipped because auth test credentials/setup were missing or invalid | 2026-06-15 |

## Verification Still Required

| Check | Required before 9/10 release score |
|---|---|
| `pnpm test:e2e:multi-user` | Tenant isolation E2E must execute with local Supabase running and valid test users |
| `pnpm test:e2e:import` | Import E2E must execute with valid auth test credentials |

## External Evidence Required

- Sentry alert routing, recipients, issue rules, metric rules, and test alert
  delivery.
- Supabase backup/PITR configuration and isolated restore drill with row counts,
  RLS check, auth smoke, app smoke, executor, reviewer, and residual risk.
- GitHub branch protection requiring CI, CodeQL, dependency/security audit,
  dependency review where applicable, approvals, stale approval dismissal,
  code-owner review, strict checks, and disabled force pushes/deletions.
- Stripe webhook endpoint health, failed-event alerting, replay,
  stale-processing, out-of-order event, failed-payment, cancellation, and
  reconciliation evidence.
- Uptime alert-fired evidence for the current public `/api/health` response.
- GDPR/DSAR lifecycle evidence for auth, profiles, preferences, billing
  metadata, support/feedback, logs, exports, backups, and reviewer sign-off.

## Retest Dates

| Area | Retest by | Trigger |
|---|---|---|
| Schengen country source | 2026-09-15 | Quarterly source review or EU/Schengen status change |
| Compliance boundary tests | Every release | Any compliance, date, import, or forecast change |
| RLS and service-role allowlist | Every release | Any Supabase migration or server route change |
| CI/security workflows | 2026-07-15 | First GitHub run evidence and branch protection review |
| Sentry and uptime alerting | 2026-07-15 | First production alert-delivery evidence |
| Supabase restore drill | 2026-07-15 | First isolated restore drill |
| Stripe lifecycle evidence | Before paid/public beta | Any billing launch or price migration |
| GDPR/DSAR lifecycle | Before public release | Any new personal data store, processor, export, or retention rule |

## Conclusion

The repository foundation is materially stronger after this pass, and the
Schengen/domain category is now above 9/10 with local test evidence. The full
infrastructure program cannot honestly be scored 9/10 across every category
until the external dashboard evidence and remaining local verification commands
above are completed and filed.
