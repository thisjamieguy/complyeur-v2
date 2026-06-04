# Audit Document Inventory

Last updated: 2026-06-04
Scope inspected:

- `/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur`
- `/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2`

The current source of truth for beta launch readiness is
`docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`.

## Current App Documents

| File path | Last modified | Purpose | Status | Key unique information | Recommended action | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md` | 2026-06-04 | Consolidated beta go/no-go checklist | Current source of truth | Readiness status, blockers, owners, next actions | Keep | New decision owner for beta release. |
| `docs/release/README.md` | 2026-06-04 | Release docs index | Current source of truth | Points future audits to the release folder | Keep | Prevents new random audit files. |
| `docs/release/AUDIT_DOCUMENT_INVENTORY.md` | 2026-06-04 | Inventory of audit/readiness docs | Current source of truth | Classification and actions for release docs | Keep | Required audit trail for consolidation. |
| `docs/release/AUDIT_CLEANUP_REPORT.md` | 2026-06-04 | Cleanup summary | Current source of truth | Files found, kept, merged, archived, deleted | Keep | Required final report for this pass. |
| `docs/archive/release-audits/README.md` | 2026-06-04 | Archive policy marker | Current source of truth | Explains why no files were moved yet | Keep | Creates safe destination without losing history. |
| `docs/BETA_LAUNCH_RESULTS.md` | 2026-06-03 11:03 | Full 18-section beta launch audit | Useful but superseded | 179 pass, 68 warn, 10 fail, WARN posture, section findings | Keep | Preserve full detail; summary merged into source of truth. |
| `docs/BETA_LAUNCH_CHECKLIST.md` | 2026-04-02 23:46 | Original pre-beta checklist template | Useful but superseded | 18-section checklist and beta definition of done | Keep | Good template/history; current status moved to source of truth. |
| `docs/beta/BETA_KNOWN_ISSUES.md` | 2026-06-03 11:03 | Known issues for beta testers | Needs completion | Tester-facing issue list and manual checks | Keep | Active supporting doc; must be distributed to testers. |
| `docs/beta/BETA_SUCCESS_METRICS.md` | 2026-02-17 18:38 | Beta success metrics | Needs completion | Activation, usage, retention, conversion, feedback targets | Keep | Active supporting doc; needs owner/dashboard. |
| `docs/GO_LIVE_CHECKLIST.md` | 2026-05-27 21:30 | Production go-live checklist | Useful but superseded | DNS, env, legal, critical flows, sign-off template | Keep | Still useful for public launch, but not beta source of truth. |
| `docs/operations/RELEASE-CHECKLIST.md` | 2026-05-29 12:49 | Historical v1 release workflow and local gates | Useful but superseded | 2026-05-29 green local gates and release phases | Keep | Already marked historical; supports release evidence. |
| `docs/RUNBOOK.md` | 2026-03-03 10:14 | Deployment and operations runbook | Needs completion | Deploy, rollback, migration, RTO/RPO, restore testing procedure | Keep | Active runbook; needs more explicit corruption/recovery plan. |
| `docs/INCIDENT_RESPONSE.md` | 2026-02-17 18:19 | SOC 2/GDPR incident response plan | Current source of truth | Severity levels, containment, GDPR 72-hour workflow | Keep | Active security/compliance runbook. |
| `docs/SOC2_READINESS_AUDIT.md` | 2026-05-15 08:08 | SOC 2 readiness assessment | Useful but superseded | 7.9/10 score, evidence gaps, DPA and backup restore gaps | Keep | Not beta owner, but important evidence map. |
| `docs/BRANCH_PROTECTION_BASELINE.md` | 2026-02-17 18:19 | GitHub branch protection baseline | Needs completion | Required main branch controls | Keep | Active supporting doc; needs external verification. |
| `docs/billing/BETA_PRICING_MODEL.md` | 2026-02-16 20:44 | Beta pricing model | Current source of truth | Plan pricing, value metric, guardrails | Keep | Active billing input. |
| `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md` | 2026-02-16 20:44 | Stripe price and webhook finalization | Needs completion | Scripts and commands to replace placeholder price IDs | Keep | Active blocker resolution runbook. |
| `docs/legal/DPA_TEMPLATE.md` | 2026-02-17 18:19 | Customer DPA template | Needs completion | Draft DPA terms and subprocessors | Keep | Legal artifact; must not archive or delete. |
| `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md` | 2026-05-29 13:54 | GDPR public-release workplan | Needs completion | P0/P1 GDPR release blockers and data maps | Keep | Active privacy/legal workplan. |
| `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md` | 2026-03-30 snapshot | Documentation gap audit | Stale/outdated | Historical documentation status and gap list | Keep | Already marked historical; useful audit trail. |
| `docs/audits/COMPLYEUR_BIG_COMPANY_CODEBASE_AUDIT.md` | 2026-05-15 08:08 | Big-company technical/product audit | Useful but superseded | Strategic scale, billing, compliance, GDPR observations | Keep | Supporting strategic audit, not beta source of truth. |
| `docs/audits/MAINTAINABILITY_SCALE_AUDIT.md` | 2026-05-15 08:08 | Maintainability and scale audit | Useful but superseded | Import complexity, file size, layer consistency findings | Keep | Not launch-critical but useful engineering history. |
| `docs/audits/PRODUCTION_READINESS_ASSESSMENT.md` | 2026-05-15 08:08 | Production readiness quick pass | Useful but superseded | Previous go verdict and dependency/build state | Keep | Historical; later beta hardening supersedes status. |
| `docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md` | 2026-05-15 08:08 | Operational readiness from 3 AM failure lens | Useful but superseded | Operational gaps and readiness framing | Keep | Historical supporting audit. |
| `docs/audits/REMEDIATION_AUDIT_2026-02-09.md` | 2026-05-15 08:08 | Remediation re-audit | Useful but superseded | Fixed scalability/resilience findings | Keep | Evidence of remediation history. |
| `docs/audits/SCALABILITY_RESILIENCE_AUDIT.md` | 2026-05-15 08:08 | Scale/resilience audit | Useful but superseded | Database, tenancy, observability risk list | Keep | Historical source for remediation audits. |
| `docs/audits/UI_Heuristic_Review.md` | 2026-05-15 08:08 | UI heuristic audit | Useful but superseded | Nielsen heuristic findings across app flows | Keep | Product/UX history, not release source. |
| `docs/security/DEPENDENCY_AUDIT_2026-03-30.md` | 2026-04-02 23:46 | Dependency audit result | Stale/outdated | Earlier 25-vulnerability snapshot | Keep | Historical; latest security check is clean. |
| `docs/security/MULTI_TENANT_ISOLATION_AUDIT_2026-02-20.md` | 2026-05-15 08:08 | Tenant isolation/RLS audit | Useful but superseded | RLS scorecard and attack scenarios | Keep | Important security evidence; needs fresh live evidence. |
| `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md` | 2026-05-29 12:14 | Pre-launch security audit | Useful but superseded | Historical blockers and remediation notes | Keep | Already marked historical; do not delete. |
| `docs/security/SAAS_SECURITY_AUDIT.md` | 2026-05-29 12:14 | Generic SaaS security checklist | Stale/outdated | Broad checklist and compliance framework | Keep | Already marked historical reference. |
| `docs/security/SECURITY_AUDIT_REPORT.md` | 2026-05-18 22:14 | Supabase security baseline | Useful but superseded | RLS baseline pass and security evidence | Keep | Security evidence, not launch source. |
| `docs/security/2026-02-28-authz-followup-audit.md` | 2026-02-28 20:21 | Authorization follow-up | Useful but superseded | MFA/action authorization findings | Keep | Security history and regression context. |
| `docs/security/complyeur-security-audit.md` | 2026-05-29 12:14 | Reusable security audit prompt/checklist | Archive candidate | Security review prompt, not result | Keep | Already marked as prompt; useful for future reviews. |
| `docs/security/complyeur_security_audit_workflow_v1.md` | 2026-05-15 08:08 | Repeatable security audit workflow | Current source of truth | Security audit process | Keep | Active process doc. |
| `docs/security/phase-5-audit-report.md` | 2026-01-07 00:47 | Phase 5 implementation audit | Stale/outdated | Early security/data-integrity pass/fail | Archive later | Historical and old; do not move until references are checked. |
| `docs/security/PENTEST-CHECKLIST.md` | 2026-05-18 22:14 | Penetration checklist | Current source of truth | Security testing checklist | Keep | Active security checklist. |
| `docs/security/rls-audit/03-rls-audit-report.md` | 2026-05-15 08:08 | Phase 3 RLS audit report | Useful but superseded | Migration/test caveat and live SQL verification warning | Keep | Important RLS history and caveat. |

## Parent Folder And Sibling Material

| File path | Last modified | Purpose | Status | Key unique information | Recommended action | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `../COMPLYEUR_BIG_COMPANY_CODEBASE_AUDIT.md` | 2026-06-03 09:22 | Parent-level duplicate of app audit | Duplicate | Same strategic audit topic as `docs/audits/...` | Archive outside repo later | Outside current repo branch; verify before moving. |
| `../PRODUCTION_READINESS_ASSESSMENT.md` | 2026-06-03 09:22 | Parent-level production readiness snapshot | Stale/outdated | Earlier hold-release verdict from 2026-03-06 | Archive outside repo later | Conflicts with newer app docs; outside current repo branch. |
| `../complyeur-security-audit.md` | 2026-06-03 09:22 | Parent-level security audit prompt | Duplicate | Older Next.js 14-era prompt copy | Archive outside repo later | Outside current repo branch; duplicate of in-repo prompt. |
| `../Audits/prompts/meta/ai_prompt_audit.md` | 2026-06-03 09:22 | Meta prompt audit template | Archive candidate | Generic prompt quality process | Leave outside repo | Not ComplyEur release evidence. |
| `../complyeur-a1-pwd/docs/**` | 2026-06-01 or earlier | Sibling copy of many app docs | Duplicate | Older duplicated docs tree | Leave outside repo | Not the active app root; do not edit from this branch. |

## Excluded Search Hits

The filename search also found application code, tests, migrations, scripts,
Git internals, generated browser audit logs, and sibling repository copies whose
names include security, audit, billing, Supabase, GDPR, or metrics. Those files
were not classified as release-readiness documents unless they are directly
linked from the release source of truth above.

Excluded generated/build directories included `node_modules`, `.next`,
`coverage`, `playwright-report`, and `test-results`.
