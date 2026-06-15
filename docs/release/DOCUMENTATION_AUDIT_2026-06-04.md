# Repository Documentation Audit

Last updated: 2026-06-04
Scope: repository-wide documentation audit for release, beta, launch, readiness, audit, compliance, checklist, operations, deployment, security, recovery, evidence, and testing material.

## Executive Summary

The repository has enough material to support a beta launch, but the documentation set is not yet cleanly layered.

The main issue is not missing documentation. It is overlap:

- several launch/readiness documents cover the same beta and production gates
- multiple security audits exist at different ages and levels of specificity
- operational guidance is split between current runbooks and historical checklists
- some historical documents are clearly marked as historical, but they still sit beside active docs and compete for authority

The strongest current source of truth is already present:

- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`

That file should remain the single decision document for beta go/no-go, with supporting detail delegated to `docs/operations/`, `docs/security/`, `docs/legal/`, `docs/compliance/`, and `docs/beta/`.

## Highest-Priority Findings

1. `docs/RUNBOOK.md` conflicts with the canonical database workflow. It instructs operators to run migrations manually in the Supabase SQL editor and says to test migrations on staging first, while the current repository rules require migration files, staged workflow, and no manual production patching. See `docs/RUNBOOK.md:64-78` versus `docs/architecture/ENVIRONMENTS.md:60-69` and the repo-level database workflow in `AGENTS.md`.
2. `docs/ENVIRONMENTS.md` duplicates `docs/architecture/ENVIRONMENTS.md` and mixes canonical policy with mutable environment-specific references such as project IDs and inactive project history. This is useful operational reference material, but it should not compete with the architecture document as an authority.
3. `docs/operations/RELEASE-CHECKLIST.md` is explicitly historical, but it still contains detailed execution instructions, progress state, staging references, and v1 release context that can easily be mistaken for the current release path. See `docs/operations/RELEASE-CHECKLIST.md:1-77`.
4. `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md` is now stale in a material way: it says `docs/DATA_DELETION_WORKFLOW.md` is missing, but that file now exists and is referenced elsewhere. See `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md:42,68`.
5. `load-testing/PRODUCTION-SUMMARY.md` makes strong production-capacity claims that read like a current readiness verdict, but the evidence is from 2026-02-04 and should be treated as historical performance evidence, not current launch approval.
6. `docs/compliance/soc2/EVIDENCE_INDEX.md` and `docs/compliance/soc2/GAPS.md` are too skeletal to serve as strong standalone control documents. They should either be expanded or explicitly framed as indexes into the fuller SOC 2 readiness audit and evidence set.

## 1. Documentation Inventory

Legend:

- Duplicate Risk: `Low`, `Medium`, `High`
- Recommendation: `KEEP`, `MERGE`, `ARCHIVE`, `DELETE`

| File | Purpose | Last Updated | Duplicate Risk | Recommendation |
| --- | --- | --- | --- | --- |
| `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md` | Current consolidated beta go/no-go and blocker tracker | 2026-06-04 | Low | KEEP |
| `docs/release/README.md` | Release docs index and entrypoint | 2026-06-04 | Low | KEEP |
| `docs/release/AUDIT_DOCUMENT_INVENTORY.md` | Prior audit inventory for release/readiness docs | 2026-06-04 | Medium | MERGE |
| `docs/release/AUDIT_CLEANUP_REPORT.md` | Prior cleanup summary for audit consolidation | 2026-06-04 | Medium | MERGE |
| `docs/archive/release-audits/README.md` | Archive policy marker for superseded release audits | 2026-06-04 | Low | KEEP |
| `docs/BETA_LAUNCH_CHECKLIST.md` | Original 18-section pre-beta checklist template | 2026-06-04 | High | ARCHIVE |
| `docs/BETA_LAUNCH_RESULTS.md` | Full section-by-section beta audit results | 2026-06-04 | High | ARCHIVE |
| `docs/GO_LIVE_CHECKLIST.md` | Production go-live checklist and sign-off template | 2026-06-04 | High | MERGE |
| `docs/RUNBOOK.md` | Deployment, rollback, restore, logging, and maintenance runbook | 2026-06-04 | Medium | KEEP |
| `docs/INCIDENT_RESPONSE.md` | Security/GDPR incident response plan | 2026-02-17 | Low | KEEP |
| `docs/SOC2_READINESS_AUDIT.md` | SOC 2 readiness assessment and evidence review | 2026-05-11 | Medium | KEEP |
| `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md` | Historical documentation gap audit | 2026-05-28 | High | ARCHIVE |
| `docs/DATA_DELETION_WORKFLOW.md` | GDPR erasure and DSAR deletion workflow | 2026-05-18 | Low | KEEP |
| `docs/DATA_CLASSIFICATION.md` | Data classification inventory | 2026-02-12 | Low | KEEP |
| `docs/ENVIRONMENTS.md` | Environment-specific operational reference with project refs | 2026-04-28 | High | MERGE |
| `docs/BRANCH_PROTECTION_BASELINE.md` | GitHub branch protection requirements | 2026-02-17 | Low | KEEP |
| `docs/ADMIN_GUIDE.md` | Admin operations reference for superadmins | 2026-03-03 | Low | KEEP |
| `docs/beta/BETA_TESTER_BRIEF.md` | Tester-facing onboarding brief | 2026-06-04 | Low | KEEP |
| `docs/beta/BETA_KNOWN_ISSUES.md` | Tester-facing known issues and external checks list | 2026-06-04 | Medium | KEEP |
| `docs/beta/BETA_SUCCESS_METRICS.md` | Beta success metric definitions and targets | 2026-02-17 | Medium | KEEP |
| `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md` | Manual beta verification gate for deployed environment | 2026-06-04 | Medium | KEEP |
| `docs/operations/BETA_VERIFICATION_AUTOMATION.md` | Repo-verifiable versus manual beta gate guide | 2026-06-04 | Low | KEEP |
| `docs/operations/BETA_SUPPORT_AND_ALERTING.md` | Support ownership and alert baseline for beta | 2026-06-04 | Low | KEEP |
| `docs/operations/BETA_EVIDENCE_LOG_TEMPLATE.md` | Template for manual beta verification evidence | 2026-06-04 | Low | KEEP |
| `docs/operations/evidence/2026-06-04-private-beta.md` | Generated evidence log instance for private beta | Untracked 2026-06-04 | Low | KEEP |
| `docs/operations/RELEASE-CHECKLIST.md` | Historical v1 release workflow with local gate notes | 2026-06-04 | High | ARCHIVE |
| `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md` | Stripe price/webhook finalization runbook | 2026-02-17 | Medium | KEEP |
| `docs/billing/BETA_PRICING_MODEL.md` | Beta pricing model and plan assumptions | 2026-02-17 | Low | KEEP |
| `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md` | P0/P1 GDPR blockers for public release | 2026-05-29 | Low | KEEP |
| `docs/legal/DPA_TEMPLATE.md` | Draft customer DPA template | 2026-02-17 | Low | KEEP |
| `docs/compliance/soc2/EVIDENCE_INDEX.md` | SOC 2 evidence pointer table | 2026-01-20 | Medium | MERGE |
| `docs/compliance/soc2/GAPS.md` | SOC 2 gap tracker | 2026-01-20 | Medium | MERGE |
| `docs/compliance/soc2/evidence/*.md` | Evidence artifacts for uptime, cron, rate limits, session timeout, tenant checks, audit log immutability, and PII log handling | Mixed, 2026-01-20 to 2026-05-11 | Low | KEEP |
| `docs/testing/e2e-page-coverage.md` | Route-to-test coverage matrix | 2026-04-02 | Low | KEEP |
| `__tests__/manual/regression-checklist.md` | Broad pre-release manual regression checklist | 2026-02-12 | High | MERGE |
| `load-testing/README.md` | Load testing guide and scripts overview | 2026-02-12 | Low | KEEP |
| `load-testing/QUICK-START.md` | Quick start for k6 load testing | 2026-02-04 | Low | KEEP |
| `load-testing/PRODUCTION-SUMMARY.md` | Historical production load-test verdict and capacity claims | 2026-02-12 | Medium | ARCHIVE |
| `load-testing/TEST-RESULTS.md` | Detailed February 2026 load-test results | 2026-02-12 | Low | KEEP |
| `docs/architecture/ENVIRONMENTS.md` | Canonical environment architecture and separation rules | 2026-01-16 | Low | KEEP |
| `docs/architecture/MIGRATION_WORKFLOW.md` | Canonical schema migration workflow | 2026-01-16 | Low | KEEP |
| `docs/architecture/PRODUCTION_SAFETY_RAILS.md` | Production safety guardrails | 2026-01-16 | Low | KEEP |
| `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md` | Current security baseline progress summary | 2026-03-12 | Medium | KEEP |
| `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md` | Historical broad pre-launch security audit | 2026-05-28 | High | ARCHIVE |
| `docs/security/SECURITY_AUDIT_REPORT.md` | Supabase security baseline audit | 2026-05-18 | Medium | KEEP |
| `docs/security/SAAS_SECURITY_AUDIT.md` | Generic SaaS security checklist/reference | 2026-05-28 | High | ARCHIVE |
| `docs/security/complyeur-security-audit.md` | Reusable security audit prompt/checklist | 2026-05-28 | High | ARCHIVE |
| `docs/security/complyeur_security_audit_workflow_v1.md` | Official repeatable security audit process | 2026-05-11 | Low | KEEP |
| `docs/security/DEPENDENCY_AUDIT_2026-03-30.md` | Historical dependency-vulnerability snapshot | 2026-03-30 | Medium | ARCHIVE |
| `docs/security/GAP_ANALYSIS.md` | Early security gap analysis against broad checklist | 2026-02-12 | High | ARCHIVE |
| `docs/security/PENTEST-CHECKLIST.md` | Current penetration testing checklist/process | 2026-05-18 | Low | KEEP |
| `docs/security/2026-02-19-pentest-checklist-results.md` | Cross-referenced pentest checklist results and addenda | 2026-05-18 | Medium | KEEP |
| `docs/security/2026-02-19-penetration-test-execution-report.md` | Severity-ordered pentest execution report | 2026-03-01 | Medium | KEEP |
| `docs/security/2026-02-19-remediation-handover.md` | Handover note for security remediation continuation | 2026-02-19 | Medium | ARCHIVE |
| `docs/security/2026-02-28-authz-followup-audit.md` | Follow-up authorization audit after pentest | 2026-03-01 | Medium | KEEP |
| `docs/security/2026-02-19-pentest-findings.json` | Machine-readable pentest findings artifact | 2026-02-23 | Low | KEEP |
| `docs/security/MULTI_TENANT_ISOLATION_AUDIT_2026-02-20.md` | Original tenant-isolation and RLS audit | 2026-05-11 | Medium | KEEP |
| `docs/security/MULTI_TENANT_ISOLATION_RETEST_2026-04-15.md` | Retest of tenant-isolation remediation | 2026-05-11 | Low | KEEP |
| `docs/security/rls-audit/03-rls-audit-report.md` | Phase 3 RLS and multi-tenant isolation audit | 2026-05-11 | Medium | KEEP |
| `docs/security/rls-audit/03-tenant-attack-test-plan.md` | Tenant attack plan for RLS verification | 2026-05-11 | Low | KEEP |
| `docs/security/phase-5-audit-report.md` | Early phase-5 audit snapshot | 2026-02-03 | High | ARCHIVE |
| `docs/audits/PRODUCTION_READINESS_ASSESSMENT.md` | Historical quick-pass production readiness review | 2026-05-11 | High | ARCHIVE |
| `docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md` | Historical operational-readiness lens from outage discussion | 2026-05-11 | High | ARCHIVE |
| `docs/audits/SCALABILITY_RESILIENCE_AUDIT.md` | Historical scale/resilience audit | 2026-05-11 | Medium | KEEP |
| `docs/audits/MAINTAINABILITY_SCALE_AUDIT.md` | Historical maintainability/scale audit | 2026-05-11 | Medium | KEEP |
| `docs/audits/COMPLYEUR_BIG_COMPANY_CODEBASE_AUDIT.md` | Strategic product/engineering audit | 2026-05-11 | Medium | KEEP |
| `docs/audits/REMEDIATION_AUDIT_2026-02-09.md` | Re-audit of earlier resilience issues | 2026-05-11 | Medium | KEEP |
| `docs/audits/UI_Heuristic_Review.md` | Historical UX heuristic audit | 2026-05-11 | Medium | KEEP |
| `memory/SECURITY-AUDIT.md` | Historical security snapshot retained for engineering memory | 2026-05-28 | High | ARCHIVE |
| `memory/PERFORMANCE-AUDIT.md` | Historical performance snapshot retained for engineering memory | 2026-05-28 | Medium | KEEP |

## 2. Duplicate Analysis

### Group A: Beta release / go-live / readiness checklists

- Primary candidate: `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- Secondary candidates:
  - `docs/BETA_LAUNCH_CHECKLIST.md`
  - `docs/BETA_LAUNCH_RESULTS.md`
  - `docs/GO_LIVE_CHECKLIST.md`
  - `docs/operations/RELEASE-CHECKLIST.md`
  - `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md`
  - `__tests__/manual/regression-checklist.md`
- Unique information:
  - `docs/BETA_LAUNCH_CHECKLIST.md`: original 18-section beta structure and definition of done
  - `docs/BETA_LAUNCH_RESULTS.md`: 18-section pass/warn/fail totals and section-level findings
  - `docs/GO_LIVE_CHECKLIST.md`: sign-off table and public-launch-specific DNS/email/legal checks
  - `docs/operations/RELEASE-CHECKLIST.md`: historical local gate evidence and v1 release sequence
  - `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md`: focused manual checks still needed after automation
  - `__tests__/manual/regression-checklist.md`: broad functional regression scenarios useful for manual QA depth
- Consolidation strategy:
  - Keep `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md` as the only decision document.
  - Keep `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md` as the manual execution checklist.
  - Merge public-launch-only items from `docs/GO_LIVE_CHECKLIST.md` into a future `docs/release/GO_LIVE_CHECKLIST.md`.
  - Move `docs/BETA_LAUNCH_CHECKLIST.md`, `docs/BETA_LAUNCH_RESULTS.md`, and `docs/operations/RELEASE-CHECKLIST.md` to archive after references are updated.
  - Pull any still-relevant manual scenarios from `__tests__/manual/regression-checklist.md` into the beta manual checklist or a dedicated QA regression guide, then archive or demote the old checklist.

### Group B: Environment and deployment guidance

- Primary candidate: `docs/architecture/ENVIRONMENTS.md`
- Secondary candidates:
  - `docs/ENVIRONMENTS.md`
  - `docs/RUNBOOK.md`
  - `docs/architecture/MIGRATION_WORKFLOW.md`
  - `docs/architecture/PRODUCTION_SAFETY_RAILS.md`
- Unique information:
  - `docs/ENVIRONMENTS.md`: concrete project refs, regions, and inactive project IDs
  - `docs/RUNBOOK.md`: deploy/rollback/log/recovery steps
  - `docs/architecture/MIGRATION_WORKFLOW.md`: canonical DB change flow
  - `docs/architecture/PRODUCTION_SAFETY_RAILS.md`: explicit safety policy
- Consolidation strategy:
  - Keep `docs/architecture/ENVIRONMENTS.md` as canonical policy.
  - Demote `docs/ENVIRONMENTS.md` to an operational reference or merge its concrete environment table into an appendix under `docs/operations/`.
  - Update `docs/RUNBOOK.md` so migration guidance points to `docs/architecture/MIGRATION_WORKFLOW.md` instead of instructing manual SQL-editor execution.

### Group C: Security posture and broad security audits

- Primary candidate: `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`
- Secondary candidates:
  - `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`
  - `docs/security/SECURITY_AUDIT_REPORT.md`
  - `docs/security/SAAS_SECURITY_AUDIT.md`
  - `docs/security/GAP_ANALYSIS.md`
  - `memory/SECURITY-AUDIT.md`
  - `docs/security/phase-5-audit-report.md`
  - `docs/security/complyeur-security-audit.md`
- Unique information:
  - `MINIMUM_SECURITY_BAR_PROGRESS`: most current high-level summary and evidence map
  - `SECURITY_AUDIT_REPORT`: Supabase/RLS-specific baseline detail
  - `PRE_LAUNCH_SECURITY_AUDIT`: broad repository review and categorized findings
  - `SAAS_SECURITY_AUDIT`: generic framework/checklist
  - `GAP_ANALYSIS`: early delta against the broad checklist
  - `memory/SECURITY-AUDIT`: historical snapshot at specific commit
  - `complyeur-security-audit`: reusable prompt, not evidence
- Consolidation strategy:
  - Use `MINIMUM_SECURITY_BAR_PROGRESS.md` as the current posture summary.
  - Keep `SECURITY_AUDIT_REPORT.md` as supporting technical evidence.
  - Archive generic, prompt-like, and clearly historical docs into a security archive folder once references are updated.

### Group D: Pentest and authorization verification

- Primary candidate: `docs/security/2026-02-19-penetration-test-execution-report.md`
- Secondary candidates:
  - `docs/security/PENTEST-CHECKLIST.md`
  - `docs/security/2026-02-19-pentest-checklist-results.md`
  - `docs/security/2026-02-19-remediation-handover.md`
  - `docs/security/2026-02-28-authz-followup-audit.md`
  - `docs/security/2026-02-19-pentest-findings.json`
- Unique information:
  - checklist: repeatable test plan
  - results doc: item-by-item evidence and addenda
  - execution report: severity-ordered management summary
  - follow-up audit: closure of authz-related work
  - JSON: machine-readable finding payload
  - handover: process context only
- Consolidation strategy:
  - Keep the checklist, execution report, results, follow-up audit, and JSON artifact.
  - Archive the remediation handover once its context is no longer needed operationally.

### Group E: Tenant isolation / RLS audits

- Primary candidate: `docs/security/MULTI_TENANT_ISOLATION_RETEST_2026-04-15.md`
- Secondary candidates:
  - `docs/security/MULTI_TENANT_ISOLATION_AUDIT_2026-02-20.md`
  - `docs/security/rls-audit/03-rls-audit-report.md`
  - `docs/security/rls-audit/03-tenant-attack-test-plan.md`
- Unique information:
  - original audit: initial issue set and scorecard
  - retest: closure status and residual warnings
  - phase 3 report: separate RLS audit framing and explicit remaining verification
  - attack plan: executable adversarial test procedure
- Consolidation strategy:
  - Treat the retest as the current status document.
  - Retain the original audit and phase-3 report as supporting evidence history.
  - Keep the attack plan active for future reruns.

### Group F: GDPR / privacy / compliance readiness

- Primary candidate: `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
- Secondary candidates:
  - `docs/DATA_DELETION_WORKFLOW.md`
  - `docs/DATA_CLASSIFICATION.md`
  - `docs/legal/DPA_TEMPLATE.md`
  - `docs/INCIDENT_RESPONSE.md`
  - `docs/SOC2_READINESS_AUDIT.md`
  - `docs/compliance/soc2/EVIDENCE_INDEX.md`
  - `docs/compliance/soc2/GAPS.md`
- Unique information:
  - GDPR workplan: current P0/P1 blockers
  - deletion workflow: operational erasure steps
  - data classification: inventory
  - DPA: customer-facing legal artifact
  - incident response: 72-hour breach handling
  - SOC 2 audit: broader control/status scoring
  - evidence index/gaps: lightweight control registry
- Consolidation strategy:
  - Keep each for its specific role.
  - Expand or merge `EVIDENCE_INDEX.md` and `GAPS.md` into the fuller SOC 2 readiness set so they are not underspecified orphan documents.

### Group G: Performance and readiness evidence

- Primary candidate: `load-testing/TEST-RESULTS.md`
- Secondary candidates:
  - `load-testing/PRODUCTION-SUMMARY.md`
  - `load-testing/README.md`
  - `load-testing/QUICK-START.md`
  - `memory/PERFORMANCE-AUDIT.md`
- Unique information:
  - quick-start and readme: execution instructions
  - test-results: raw evidence
  - production-summary: executive summary
  - performance audit: broader historical perf findings
- Consolidation strategy:
  - Keep the README, quick start, and raw results.
  - Archive or clearly relabel the production summary as historical evidence because its readiness language is too strong for a dated test.

### Group H: Readiness and strategic audits

- Primary candidate: `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- Secondary candidates:
  - `docs/audits/PRODUCTION_READINESS_ASSESSMENT.md`
  - `docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md`
  - `docs/audits/SCALABILITY_RESILIENCE_AUDIT.md`
  - `docs/audits/MAINTAINABILITY_SCALE_AUDIT.md`
  - `docs/audits/COMPLYEUR_BIG_COMPANY_CODEBASE_AUDIT.md`
  - `docs/audits/REMEDIATION_AUDIT_2026-02-09.md`
  - `docs/audits/UI_Heuristic_Review.md`
  - `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md`
- Unique information:
  - release source of truth: current decision status
  - readiness assessments: historical readiness snapshots
  - scale/maintainability/remediation/UI audits: specialist supporting views
  - documentation gap report: historical doc-state snapshot
- Consolidation strategy:
  - Keep strategic audits for historical reference.
  - Archive the old readiness snapshots and documentation gap report once the release tree links are updated.

## 3. Proposed Final Structure

This proposal follows existing repository patterns instead of inventing a new top-level taxonomy.

```text
docs/
├── release/
│   ├── README.md
│   ├── BETA_RELEASE_SOURCE_OF_TRUTH.md
│   ├── GO_LIVE_CHECKLIST.md
│   ├── DOCUMENTATION_AUDIT_2026-06-04.md
│   └── historical/
│       ├── BETA_LAUNCH_CHECKLIST_2026-04-02.md
│       ├── BETA_LAUNCH_RESULTS_2026-06-03.md
│       ├── PRODUCTION_READINESS_ASSESSMENT_2026-03-30.md
│       └── DOCUMENTATION_GAP_REPORT_2026-03-30.md
├── beta/
│   ├── BETA_TESTER_BRIEF.md
│   ├── BETA_KNOWN_ISSUES.md
│   └── BETA_SUCCESS_METRICS.md
├── operations/
│   ├── RUNBOOK.md
│   ├── INCIDENT_RESPONSE.md
│   ├── BETA_MANUAL_VERIFICATION_CHECKLIST.md
│   ├── BETA_VERIFICATION_AUTOMATION.md
│   ├── BETA_SUPPORT_AND_ALERTING.md
│   ├── BETA_EVIDENCE_LOG_TEMPLATE.md
│   ├── ENVIRONMENT_REFERENCE.md
│   └── evidence/
├── security/
│   ├── README.md
│   ├── MINIMUM_SECURITY_BAR_PROGRESS.md
│   ├── SECURITY_AUDIT_REPORT.md
│   ├── PENTEST-CHECKLIST.md
│   ├── 2026-02-19-penetration-test-execution-report.md
│   ├── 2026-02-19-pentest-checklist-results.md
│   ├── 2026-02-28-authz-followup-audit.md
│   ├── MULTI_TENANT_ISOLATION_AUDIT_2026-02-20.md
│   ├── MULTI_TENANT_ISOLATION_RETEST_2026-04-15.md
│   ├── rls-audit/
│   └── historical/
├── compliance/
│   ├── DATA_CLASSIFICATION.md
│   ├── DATA_DELETION_WORKFLOW.md
│   └── soc2/
│       ├── SOC2_READINESS_AUDIT.md
│       ├── EVIDENCE_INDEX.md
│       ├── GAPS.md
│       └── evidence/
├── legal/
│   ├── GDPR_PUBLIC_RELEASE_WORKPLAN.md
│   └── DPA_TEMPLATE.md
├── architecture/
│   ├── ENVIRONMENTS.md
│   ├── MIGRATION_WORKFLOW.md
│   └── PRODUCTION_SAFETY_RAILS.md
└── archive/
    ├── release-audits/
    ├── security-audits/
    └── readiness-snapshots/
```

## 4. Quality Review Of Retained Documents

### Retain as authoritative or near-authoritative

- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
  - Accuracy: strong
  - Relevance: strong
  - Gaps: still depends on external evidence and named owners
  - Action: keep as the single decision document
- `docs/architecture/ENVIRONMENTS.md`
  - Accuracy: strong
  - Relevance: strong
  - Gaps: none found in scope
  - Action: keep canonical
- `docs/architecture/MIGRATION_WORKFLOW.md`
  - Accuracy: strong
  - Relevance: strong
  - Gaps: should be linked more directly from `docs/RUNBOOK.md`
  - Action: keep canonical
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
  - Accuracy: strong
  - Relevance: strong
  - Gaps: still open P0/P1 items
  - Action: keep active
- `docs/DATA_DELETION_WORKFLOW.md`
  - Accuracy: appears aligned with current manual deletion model
  - Relevance: strong
  - Gaps: none material found in this audit
  - Action: keep active
- `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md`
  - Accuracy: strong
  - Relevance: strong
  - Gaps: should stay tightly scoped to the deployed beta pass
  - Action: keep active

### Retain but update

- `docs/RUNBOOK.md`
  - Accuracy: mixed
  - Contradictions:
    - migration section suggests manual SQL editor execution
    - says migrations should be tested on staging despite canonical two-environment model
  - Action: update before relying on it as operational authority
- `docs/ENVIRONMENTS.md`
  - Accuracy: mostly plausible
  - Relevance: useful
  - Contradiction: competes with canonical architecture doc
  - Action: convert to operational reference or merge
- `docs/compliance/soc2/EVIDENCE_INDEX.md`
  - Completeness: too thin
  - Action: expand or fold into `docs/SOC2_READINESS_AUDIT.md`
- `docs/compliance/soc2/GAPS.md`
  - Completeness: too thin
  - Action: expand or fold into the SOC 2 readiness set
- `docs/beta/BETA_SUCCESS_METRICS.md`
  - Accuracy: targets are reasonable
  - Gap: no owner, dashboard, or measurement source
  - Action: keep, then add ownership and evidence path
- `docs/beta/BETA_KNOWN_ISSUES.md`
  - Accuracy: good
  - Gap: should be kept current as blocker state changes
  - Action: keep active and update during launch week

### Retain as historical evidence only

- `docs/BETA_LAUNCH_CHECKLIST.md`
- `docs/BETA_LAUNCH_RESULTS.md`
- `docs/operations/RELEASE-CHECKLIST.md`
- `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md`
- `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`
- `docs/security/SAAS_SECURITY_AUDIT.md`
- `docs/security/GAP_ANALYSIS.md`
- `docs/security/phase-5-audit-report.md`
- `docs/audits/PRODUCTION_READINESS_ASSESSMENT.md`
- `docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md`
- `memory/SECURITY-AUDIT.md`
- `load-testing/PRODUCTION-SUMMARY.md`

These should remain available for traceability, but they should not sit on the main path for current launch decisions.

## 5. Safe Cleanup Plan

### Files safe to archive immediately after references are updated

- `docs/BETA_LAUNCH_CHECKLIST.md`
- `docs/BETA_LAUNCH_RESULTS.md`
- `docs/operations/RELEASE-CHECKLIST.md`
- `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md`
- `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`
- `docs/security/SAAS_SECURITY_AUDIT.md`
- `docs/security/GAP_ANALYSIS.md`
- `docs/security/phase-5-audit-report.md`
- `docs/audits/PRODUCTION_READINESS_ASSESSMENT.md`
- `docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md`
- `memory/SECURITY-AUDIT.md`
- `load-testing/PRODUCTION-SUMMARY.md`

### Files requiring merge/update work first

- `docs/RUNBOOK.md`
- `docs/ENVIRONMENTS.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `__tests__/manual/regression-checklist.md`
- `docs/compliance/soc2/EVIDENCE_INDEX.md`
- `docs/compliance/soc2/GAPS.md`
- `docs/release/AUDIT_DOCUMENT_INVENTORY.md`
- `docs/release/AUDIT_CLEANUP_REPORT.md`

### Files that should remain untouched except for normal maintenance

- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/architecture/ENVIRONMENTS.md`
- `docs/architecture/MIGRATION_WORKFLOW.md`
- `docs/architecture/PRODUCTION_SAFETY_RAILS.md`
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
- `docs/legal/DPA_TEMPLATE.md`
- `docs/DATA_DELETION_WORKFLOW.md`
- `docs/DATA_CLASSIFICATION.md`
- `docs/security/complyeur_security_audit_workflow_v1.md`
- `docs/security/PENTEST-CHECKLIST.md`
- `docs/security/MULTI_TENANT_ISOLATION_RETEST_2026-04-15.md`

### Files that should become or remain authoritative sources

- Beta launch decision owner: `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- Environment architecture owner: `docs/architecture/ENVIRONMENTS.md`
- Migration process owner: `docs/architecture/MIGRATION_WORKFLOW.md`
- Production safety owner: `docs/architecture/PRODUCTION_SAFETY_RAILS.md`
- Incident response owner: `docs/INCIDENT_RESPONSE.md`
- GDPR release blocker owner: `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
- Deletion workflow owner: `docs/DATA_DELETION_WORKFLOW.md`
- Security posture summary owner: `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`

### Exact git-safe actions

1. Update references before moving files:
   - `rg -n 'BETA_LAUNCH_CHECKLIST|BETA_LAUNCH_RESULTS|RELEASE-CHECKLIST|PRODUCTION_READINESS_ASSESSMENT|DOCUMENTATION_GAP_REPORT_2026-03-30' docs README.md`
2. Create archive folders if needed:
   - `mkdir -p docs/archive/release-audits docs/archive/security-audits docs/archive/readiness-snapshots`
3. Move release-history documents with `git mv`:
   - `git mv docs/BETA_LAUNCH_CHECKLIST.md docs/archive/release-audits/BETA_LAUNCH_CHECKLIST_2026-04-02.md`
   - `git mv docs/BETA_LAUNCH_RESULTS.md docs/archive/release-audits/BETA_LAUNCH_RESULTS_2026-06-03.md`
   - `git mv docs/operations/RELEASE-CHECKLIST.md docs/archive/release-audits/RELEASE-CHECKLIST_v1_2026-05-29.md`
4. Move readiness/security history with `git mv`:
   - `git mv docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md docs/archive/readiness-snapshots/DOCUMENTATION_GAP_REPORT_2026-03-30.md`
   - `git mv docs/audits/PRODUCTION_READINESS_ASSESSMENT.md docs/archive/readiness-snapshots/PRODUCTION_READINESS_ASSESSMENT_2026-03-30.md`
   - `git mv docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md docs/archive/readiness-snapshots/REDDIT_PRODUCTION_READINESS_ASSESSMENT_2026-02-08.md`
   - `git mv docs/security/PRE_LAUNCH_SECURITY_AUDIT.md docs/archive/security-audits/PRE_LAUNCH_SECURITY_AUDIT_2026-02-07.md`
   - `git mv docs/security/SAAS_SECURITY_AUDIT.md docs/archive/security-audits/SAAS_SECURITY_AUDIT_2026-01.md`
   - `git mv docs/security/GAP_ANALYSIS.md docs/archive/security-audits/GAP_ANALYSIS_2026-01-14.md`
   - `git mv docs/security/phase-5-audit-report.md docs/archive/security-audits/PHASE_5_AUDIT_REPORT_2026-01-06.md`
5. After moves, update all inbound links and folder READMEs in the same commit.
6. In a separate commit, update `docs/RUNBOOK.md`, merge `docs/ENVIRONMENTS.md`, and rationalize SOC 2 index/gap docs.

## 6. Risk Assessment

### Information at risk during consolidation

- Historical audit findings could lose context if moved without preserving dates in filenames.
- Security prompt documents could be mistaken for evidence if left in active folders; the opposite risk is losing reusable methodology if they are deleted.
- Raw performance and pentest artifacts could become detached from their summaries if archive moves are done without link updates.
- The distinction between beta-only and public-launch-only gates could be blurred if `docs/GO_LIVE_CHECKLIST.md` is merged too aggressively into the beta source-of-truth file.
- Concrete environment identifiers in `docs/ENVIRONMENTS.md` could be lost if the document is removed instead of demoted to an operational reference.

### Controls to avoid loss

- Move, do not delete, historical assets.
- Preserve dates in archived filenames.
- Update links in the same commit as the move.
- Keep one README or index in every archive folder explaining why files moved.
- Treat legal, GDPR, incident response, pentest, RLS, and evidence artifacts as non-destructive records.

## 7. Recommended Next Actions Before Beta Launch

1. Fix `docs/RUNBOOK.md` so its migration guidance matches `docs/architecture/MIGRATION_WORKFLOW.md` and the two-environment model.
2. Decide whether `docs/ENVIRONMENTS.md` becomes `docs/operations/ENVIRONMENT_REFERENCE.md` or is merged into a narrower operations appendix.
3. Move historical launch-readiness documents out of the active path and into `docs/archive/`.
4. Create a single current public-launch checklist by merging the non-beta-only value from `docs/GO_LIVE_CHECKLIST.md`.
5. Expand `docs/compliance/soc2/EVIDENCE_INDEX.md` and `docs/compliance/soc2/GAPS.md` or fold them into the SOC 2 readiness document.
6. Add ownership and reporting source to `docs/beta/BETA_SUCCESS_METRICS.md`.
7. Keep `docs/beta/BETA_KNOWN_ISSUES.md` synchronized with the blocker list in `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`.
8. Archive broad generic security framework docs that are no longer active authorities.
9. Re-label `load-testing/PRODUCTION-SUMMARY.md` as historical evidence or move it under an archived performance evidence location.
10. Add a short `README.md` to `docs/security/` and `docs/compliance/` declaring which files are current authority versus historical evidence.
