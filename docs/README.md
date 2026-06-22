# Documentation Map

This file is the central navigation point for repository documentation.

Use it to answer six questions quickly:

1. Which document is authoritative?
2. Where are release decisions made?
3. Where do operational procedures live?
4. Where does architecture policy live?
5. Where do compliance and legal documents live?
6. Which documents are historical only?

## Authority Model

- **Authoritative:** current source of truth for a topic
- **Supporting:** active companion document used to execute, evidence, or refine the authoritative document
- **Historical:** retained for audit trail or context; not current authority
- **Archived:** superseded and intended to be moved out of the active path in a later cleanup pass

## Start Here

- Release decision owner:
  [`docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`](release/BETA_RELEASE_SOURCE_OF_TRUTH.md)
- Architecture authority:
  [`docs/architecture/ENVIRONMENTS.md`](architecture/ENVIRONMENTS.md)
- Migration authority:
  [`docs/architecture/MIGRATION_WORKFLOW.md`](architecture/MIGRATION_WORKFLOW.md)
- Operational recovery/runbook:
  [`docs/RUNBOOK.md`](RUNBOOK.md)
- GDPR/public-release workplan:
  [`docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`](legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md)
- Security posture summary:
  [`docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`](security/MINIMUM_SECURITY_BAR_PROGRESS.md)

## Release

- **Authoritative:** [`docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`](release/BETA_RELEASE_SOURCE_OF_TRUTH.md)
- Supporting:
  - [`docs/release/README.md`](release/README.md)
  - [`docs/beta/BETA_KNOWN_ISSUES.md`](beta/BETA_KNOWN_ISSUES.md)
  - [`docs/beta/BETA_SUCCESS_METRICS.md`](beta/BETA_SUCCESS_METRICS.md)
  - [`docs/GO_LIVE_CHECKLIST.md`](GO_LIVE_CHECKLIST.md)
  - [`docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md`](operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md)
  - [`docs/operations/BETA_VERIFICATION_AUTOMATION.md`](operations/BETA_VERIFICATION_AUTOMATION.md)
- Historical:
  - [`docs/BETA_LAUNCH_CHECKLIST.md`](BETA_LAUNCH_CHECKLIST.md)
  - [`docs/BETA_LAUNCH_RESULTS.md`](BETA_LAUNCH_RESULTS.md)
  - [`docs/operations/RELEASE-CHECKLIST.md`](operations/RELEASE-CHECKLIST.md)

## Operations

- **Authoritative procedure set:** [`docs/RUNBOOK.md`](RUNBOOK.md)
- Supporting:
  - [`docs/INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md)
  - [`docs/BRANCH_PROTECTION_BASELINE.md`](BRANCH_PROTECTION_BASELINE.md)
  - [`docs/operations/BETA_SUPPORT_AND_ALERTING.md`](operations/BETA_SUPPORT_AND_ALERTING.md)
  - [`docs/operations/BETA_EVIDENCE_LOG_TEMPLATE.md`](operations/BETA_EVIDENCE_LOG_TEMPLATE.md)
  - [`docs/operations/evidence/`](operations/evidence/)
- Operational reference only:
  - [`docs/ENVIRONMENTS.md`](ENVIRONMENTS.md)

## Architecture

- **Authoritative:** [`docs/architecture/ENVIRONMENTS.md`](architecture/ENVIRONMENTS.md)
- Supporting authoritative docs:
  - [`docs/architecture/MIGRATION_WORKFLOW.md`](architecture/MIGRATION_WORKFLOW.md)
  - [`docs/architecture/PRODUCTION_SAFETY_RAILS.md`](architecture/PRODUCTION_SAFETY_RAILS.md)
  - [`docs/architecture/README.md`](architecture/README.md)
  - [`docs/CALCULATION_LOGIC.md`](CALCULATION_LOGIC.md) — human-readable 90/180-day compliance engine spec (rolling window, Schengen membership, worked examples)

## Compliance And Legal

- **Authoritative public-release privacy workplan:** [`docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`](legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md)
- Supporting:
  - [`docs/DATA_DELETION_WORKFLOW.md`](DATA_DELETION_WORKFLOW.md)
  - [`docs/DATA_CLASSIFICATION.md`](DATA_CLASSIFICATION.md)
  - [`docs/legal/DPA_TEMPLATE.md`](legal/DPA_TEMPLATE.md)
  - [`docs/SOC2_READINESS_AUDIT.md`](SOC2_READINESS_AUDIT.md)
  - [`docs/compliance/soc2/EVIDENCE_INDEX.md`](compliance/soc2/EVIDENCE_INDEX.md)
  - [`docs/compliance/soc2/GAPS.md`](compliance/soc2/GAPS.md)

## Security

- **Authoritative summary:** [`docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`](security/MINIMUM_SECURITY_BAR_PROGRESS.md)
- Supporting evidence and procedures:
  - [`docs/security/SECURITY_AUDIT_REPORT.md`](security/SECURITY_AUDIT_REPORT.md)
  - [`docs/security/complyeur_security_audit_workflow_v1.md`](security/complyeur_security_audit_workflow_v1.md)
  - [`docs/security/PENTEST-CHECKLIST.md`](security/PENTEST-CHECKLIST.md)
  - [`docs/security/2026-02-19-penetration-test-execution-report.md`](security/2026-02-19-penetration-test-execution-report.md)
  - [`docs/security/MULTI_TENANT_ISOLATION_RETEST_2026-04-15.md`](security/MULTI_TENANT_ISOLATION_RETEST_2026-04-15.md)
  - [`docs/security/rls-audit/03-tenant-attack-test-plan.md`](security/rls-audit/03-tenant-attack-test-plan.md)
- Historical:
  - [`docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`](security/PRE_LAUNCH_SECURITY_AUDIT.md)
  - [`docs/security/SAAS_SECURITY_AUDIT.md`](security/SAAS_SECURITY_AUDIT.md)
  - [`docs/security/GAP_ANALYSIS.md`](security/GAP_ANALYSIS.md)

## Testing

- **Authoritative coverage reference:** [`docs/testing/e2e-page-coverage.md`](testing/e2e-page-coverage.md)
- Supporting:
  - [`__tests__/manual/regression-checklist.md`](../__tests__/manual/regression-checklist.md)
  - [`load-testing/README.md`](../load-testing/README.md)
  - [`load-testing/TEST-RESULTS.md`](../load-testing/TEST-RESULTS.md)
- Historical:
  - [`load-testing/PRODUCTION-SUMMARY.md`](../load-testing/PRODUCTION-SUMMARY.md)

## Historical Documents

These documents are intentionally preserved but should not be treated as current authority:

- [`docs/BETA_LAUNCH_CHECKLIST.md`](BETA_LAUNCH_CHECKLIST.md)
- [`docs/BETA_LAUNCH_RESULTS.md`](BETA_LAUNCH_RESULTS.md)
- [`docs/operations/RELEASE-CHECKLIST.md`](operations/RELEASE-CHECKLIST.md)
- [`docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`](security/PRE_LAUNCH_SECURITY_AUDIT.md)
- [`docs/security/SAAS_SECURITY_AUDIT.md`](security/SAAS_SECURITY_AUDIT.md)
- [`docs/audits/PRODUCTION_READINESS_ASSESSMENT.md`](audits/PRODUCTION_READINESS_ASSESSMENT.md)
- [`docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md`](audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md)

## Current Audits

- [`docs/audits/DOCUMENTATION_AUDIT_2026-06-21.md`](audits/DOCUMENTATION_AUDIT_2026-06-21.md) — latest documentation/staleness audit
- [`docs/audits/ENGINEERING_AUDIT_2026-06-15.md`](audits/ENGINEERING_AUDIT_2026-06-15.md)
- [`docs/audits/DOCUMENTATION_AUDIT_2026-06-15.md`](audits/DOCUMENTATION_AUDIT_2026-06-15.md) — superseded by the 2026-06-21 audit
- [`docs/overnight-hardening/OVERNIGHT_HARDENING_STATUS.md`](overnight-hardening/OVERNIGHT_HARDENING_STATUS.md)

## Section Map

- `architecture/`: architecture decisions, environment model, migration workflow
- `audits/`: broad product and codebase assessments
- `beta/`: beta launch planning, metrics, known issues, and outcomes
- `billing/`: Stripe pricing and billing operations
- `compliance/`: compliance programs and evidence material
- `engineering/`: durable engineering decisions, ADRs, and recurring lessons
- `internal/`: private/internal notes and prompt documents
- `legal/`: legal templates and policy support docs
- `marketing/blog-drafts/`: draft content and publication working files
- `operations/`: runbooks, release execution helpers, and beta support docs
- `plans/`: feature design and implementation planning docs
- `release/`: current release source of truth, inventories, and consolidation docs
- `security/`: security audits, pentest material, and authorization reviews
- `standards/`: coding, security, testing, and AI-agent governance standards
- `testing/`: test strategy and quality references

## Root Hygiene

- Keep new markdown files out of the repo root unless they are primary entrypoints such as `README.md`, `CHANGELOG.md`, `AGENTS.md`, or `CLAUDE.md`.
- Prefer adding operational, audit, planning, and draft content under the relevant `docs/` subfolder.
- When adding a new release, operations, security, or compliance document, link it from this file and the relevant subfolder README in the same change.
