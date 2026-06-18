# SOC 2 Evidence Index

## Status

**Supporting compliance index. Not a standalone readiness assessment.**

- Use `docs/SOC2_READINESS_AUDIT.md` for the current readiness narrative and
  control-level assessment.
- Use `docs/compliance/soc2/evidence/` for the underlying evidence artifacts.
- This file is intentionally minimal today and should be expanded only when new
  evidence is verified and linked.

## Maintenance Notes

- Expand this index as additional verified evidence is added.
- Keep entries aligned with `docs/SOC2_READINESS_AUDIT.md`.
- Do not infer control coverage from this file alone.

| Control | Evidence Type | Location | Description |
|---|---|---|---|
| A1/CC7 | Screenshot Evidence | docs/compliance/soc2/evidence/uptime_monitoring_evidence.md | external uptime monitoring and alerting verified |
| CC6/CC7 | Repository Controls | .github/workflows/security.yml | dependency audit and dependency review workflow added; GitHub run evidence pending |
| CC6/CC7 | Repository Controls | .github/workflows/codeql.yml | CodeQL security-and-quality workflow added; GitHub run evidence pending |
| CC6/CC7 | Repository Controls | __tests__/unit/security/service-role-allowlist.test.ts | static allowlist test for service-role client usage |
| CC6/CC7 | Repository Controls | lib/security/request-origin.ts | centralized first-party mutation origin validation |
| A1 | Operational Procedure | docs/RUNBOOK.md | public anon health, protected internal health, backup restore drill, and vendor outage procedures |
| CC7 | Operational Evidence Required | docs/operations/SENTRY_OWNERSHIP.md | Sentry routing ownership documented; live alert delivery evidence pending |
