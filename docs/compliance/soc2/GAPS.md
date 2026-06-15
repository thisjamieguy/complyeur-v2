# SOC 2 Gaps

## Status

**Supporting compliance gap tracker. Not a standalone source of truth.**

- Use `docs/SOC2_READINESS_AUDIT.md` for the current assessment of readiness,
  residual gaps, and remediation priority.
- Use this file as a lightweight index of discrete gap records only.
- This file is intentionally incomplete and should not be read in isolation.

## TODO

- Add entries only when a gap has a verified owner, status, and linked
  evidence.
- Cross-check any future entry against `docs/SOC2_READINESS_AUDIT.md` before
  treating it as current.

| Gap | Control | Status | Evidence |
|---|---|---|---|
| Uptime monitoring was documented but lacked runtime evidence | A1/CC7 | Remediated (verified) | docs/compliance/soc2/evidence/uptime_monitoring_evidence.md |
| Security scanning was not enforced as a separate CI gate | CC6/CC7 | Partially remediated | `.github/workflows/security.yml`, `.github/workflows/codeql.yml`, and `.github/dependabot.yml` added; GitHub run and branch-protection evidence pending |
| Service-role usage lacked a static repository allowlist | CC6 | Remediated in repo | `__tests__/unit/security/service-role-allowlist.test.ts` |
| Public health endpoint performed deep/service-role-style checks | A1/CC6 | Remediated in repo | `app/api/health/route.ts` is anon `ping()` only; `app/api/internal/health/route.ts` is CRON-protected |
| Backup/PITR restore drill lacks current evidence | A1 | Open | `docs/RUNBOOK.md` defines required drill and evidence; execution evidence pending |
| Sentry alert routing and test delivery lack current evidence | CC7 | Open | `docs/operations/SENTRY_OWNERSHIP.md`, `docs/operations/evidence/EVIDENCE_STATUS.md` |
| Stripe lifecycle monitoring lacks current evidence | CC7/A1 | Open | `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md`, `docs/operations/evidence/EVIDENCE_STATUS.md` |
