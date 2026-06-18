# Public Release Checklist

## Status

**Authoritative checklist.** This is the detailed readiness checklist for
ComplyEur's first public paid release. Use
`docs/release/PUBLIC_RELEASE_SOURCE_OF_TRUTH.md` for current status,
blockers, findings, and go/no-go decisions.

Last updated: 2026-06-18

## Exit Standard

Do not treat ComplyEur as ready for a public paid launch until every section
below is either:

- marked `Ready`, with evidence linked in the source-of-truth document, or
- explicitly risk-accepted with a named owner and a dated rationale

## Checklist Sections

### 1. Release Governance And Evidence

- [ ] Public-release source of truth exists and is kept current.
- [ ] Public-release blockers, owners, and next actions are consolidated.
- [ ] Required evidence links are attached for external or operational claims.
- [ ] `docs/PROJECT_STATUS.md` reflects the active release milestone and
      recommended next work.

### 2. Core Compliance Correctness

- [ ] Rolling 90/180-day logic remains deterministic and date-safe.
- [ ] Schengen country logic is centralized and date-aware.
- [ ] Boundary conditions are covered for 89/90/91-day cases.
- [ ] Forecasting and safe-entry logic use the same compliance model.
- [ ] Import-to-compliance flows have regression coverage.

### 3. Import And Data Quality

- [ ] CSV/XLSX/Gantt parsers validate format, size, and row constraints.
- [ ] Date parsing avoids timezone-shift errors in compliance paths.
- [ ] Duplicate, overlap, and invalid-row handling are covered by tests.
- [ ] Import privacy controls minimize raw PII retention.

### 4. Auth And Session Security

- [ ] Signup, login, password reset, email verification, and MFA paths are
      implemented and tested to the required public-release level.
- [ ] Rate limiting and abuse controls exist for auth-sensitive routes.
- [ ] Privileged actions enforce MFA where policy requires it.
- [ ] Password reset and verification flows have live evidence and regression
      coverage.

### 5. Authorization And Tenant Isolation

- [ ] RLS remains enabled and aligned with the documented tenant model.
- [ ] Owner/admin/manager/viewer permissions are enforced server-side.
- [ ] Cross-tenant read, write, delete, and export scenarios have fresh
      evidence.
- [ ] Service-role usage remains server-only and allowlisted.

### 6. Privacy, GDPR, And Legal Readiness

- [ ] DSAR coverage is complete or explicitly documented for every
      personal-data store.
- [ ] Erasure, anonymisation, and retention behavior are accurate and tested.
- [ ] Public privacy, cookie, and legal pages match implementation.
- [ ] Processor, transfer, and legal-review evidence exists for public release.

### 7. Billing And Paid-Customer Readiness

- [ ] Checkout, subscription state, portal access, and entitlement checks are
      protected and tested.
- [x] Stripe webhook verification, replay handling, and reconciliation are
      evidenced.
- [x] Older Stripe lifecycle events cannot overwrite fresher entitlement state.
- [ ] Public pricing and billing copy matches real runtime behavior.
- [ ] Support and failure-handling paths are defined for paying customers.

### 8. App Security Hardening

- [ ] Security headers, origin checks, validation, and cron protections are in
      place.
- [ ] Sensitive logging is redacted appropriately.
- [ ] Dependency scanning and security workflows are configured and enforced.
- [ ] Public/internal health and abuse-monitoring controls have evidence.

### 9. UI, UX, Accessibility, And Manual Coverage

- [ ] Public pages, auth pages, and core dashboard paths have current coverage.
- [ ] Privileged/admin/stateful gaps are explicitly tracked.
- [ ] Error, loading, and empty states exist for key async flows.
- [ ] Accessibility and mobile baselines are current enough for release claims.

### 10. Tech Debt, Code Bloat, And Maintainability

- [ ] Largest/high-churn files are identified and reviewed for release risk.
- [ ] Dead-code, duplication, or oversized modules are documented.
- [ ] Stale TODO-style placeholders and historical doc conflicts are resolved
      or quarantined.
- [ ] Release-critical docs are concise, current, and cross-linked.

### 11. Operations, Monitoring, And Recovery

- [ ] Recovery and restore evidence exists at the required public-release
      level.
- [ ] Production support, incident response, and alert routing are owned.
- [ ] Backup/PITR posture is documented and acceptable for paid customers.
- [x] `/api/cron/beta-monitoring` first-run evidence is captured with either an
      alert-delivery result or an explicit no-alert result.
- [ ] Public-release operations checks do not rely on founder-only tribal
      knowledge.

## Verification Expectations

Use the smallest verification that proves the claim:

- Compliance logic: `pnpm test:compliance`
- Type safety and repo health: `pnpm typecheck`, `pnpm lint`, `pnpm build`
- Unit and integration coverage: targeted `vitest` suites
- E2E/manual coverage: relevant Playwright suites plus explicit manual-evidence
  gaps
- Dependency and bloat checks: `pnpm security:check`, `pnpm knip`

## Related Documents

- `docs/release/PUBLIC_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/PROJECT_STATUS.md`
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
