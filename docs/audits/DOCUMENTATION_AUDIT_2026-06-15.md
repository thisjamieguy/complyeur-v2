# Documentation Audit 2026-06-15

Branch: `codex/engineering-audit-and-hardening-2026-06-15`  
Started: 2026-06-15 23:29 BST

## Executive Summary

The documentation set is useful but large. The strongest asset is `docs/README.md`, which defines authority levels and points readers toward current release, architecture, operations, GDPR, security, and testing documents. The main drift risk is that historical reports and older security/release docs remain easy to discover alongside current source-of-truth files.

No documents were deleted in this sprint.

## Source Of Truth Files

- `docs/README.md`: central documentation map and authority model.
- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`: release decision authority.
- `docs/architecture/ENVIRONMENTS.md`: architecture/environment authority.
- `docs/architecture/MIGRATION_WORKFLOW.md`: migration workflow authority.
- `docs/RUNBOOK.md`: operations and recovery authority.
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`: GDPR/public-release workplan.
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`: current security posture summary.
- `docs/testing/e2e-page-coverage.md`: E2E page coverage reference.
- `docs/engineering/README.md`: durable engineering memory and ADR index.
- `docs/standards/`: coding, security, testing, and AI-agent governance standards.

## Archive Candidates

These files appear useful for audit trail but should not remain visually equivalent to current docs:

- `docs/BETA_LAUNCH_CHECKLIST.md`
- `docs/BETA_LAUNCH_RESULTS.md`
- `docs/operations/RELEASE-CHECKLIST.md`
- `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`
- `docs/security/SAAS_SECURITY_AUDIT.md`
- `docs/security/GAP_ANALYSIS.md`
- `docs/audits/PRODUCTION_READINESS_ASSESSMENT.md`
- `docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md`
- `docs/performance-optimization-report.md`
- `docs/plans/2025-02-03-comprehensive-test-suite-design.md`
- `docs/plans/2026-03-01-hero-upgrade.md`
- `docs/plans/2026-03-01-landing-performance.md`
- `docs/superpowers/plans/*` once the corresponding implementation is complete.

## Duplicate Documents

Duplicate filenames found across subtrees:

- `README.md`: expected, but noisy in search.
- `ENVIRONMENTS.md`: root operational reference and architecture authority both exist.
- `2026-05-18-exports-split-panel-redesign.md`: appears in more than one docs subtree.

Large docs that may overlap in release/security purpose:

- `docs/security/SAAS_SECURITY_AUDIT.md` and `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`
- `docs/BETA_LAUNCH_CHECKLIST.md`, `docs/BETA_LAUNCH_RESULTS.md`, and `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/audits/MAINTAINABILITY_SCALE_AUDIT.md`, `docs/audits/SCALABILITY_RESILIENCE_AUDIT.md`, and this engineering audit.

## Stale Or Conflicting Signals

- `docs/security/GAP_ANALYSIS.md` includes a critical MFA TODO-style claim. Current security state should be verified against source and `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md` before using it.
- `docs/compliance/soc2/EVIDENCE_INDEX.md` and `docs/compliance/soc2/GAPS.md` still contain TODO placeholders.
- Historical launch docs claim source TODO/FIXME/HACK markers were zero; current app source remains effectively clean, but docs still contain TODO references.

## Recommended Consolidation Actions

1. Add an `docs/archive/` or `docs/historical/` convention and move superseded reports there in a dedicated documentation PR.
2. Keep `docs/README.md` as the single navigation surface; require new audit/release/security docs to link from it.
3. Add a one-line status banner to historical security/release docs that points to the current source of truth.
4. Consolidate repeated release checklists into `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md` plus operational evidence links.
5. Replace SOC 2 TODO placeholders with current evidence links or mark the files as scaffold-only.
6. Preserve detailed old audits for audit trail, but remove them from active decision paths.

## Documents Added In This Sprint

- `docs/audits/ENGINEERING_AUDIT_2026-06-15.md`
- `docs/audits/DOCUMENTATION_AUDIT_2026-06-15.md`
- `docs/overnight-hardening/OVERNIGHT_HARDENING_STATUS.md`

## Navigation Updates

- `docs/README.md` was updated to link the new June 15 engineering and documentation audits.
