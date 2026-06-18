# Beta Release Source Of Truth

## Status

**Authoritative.** This document is the current source of truth for ComplyEur
private beta go/no-go decisions.

- Use this file for readiness status, blockers, owners, and next actions.
- Use supporting documents for execution detail and evidence capture.
- Treat older launch checklists and audit summaries as historical reference
  only.

Last updated: 2026-06-16
Baseline commit reviewed: `08002bf chore: complete authenticated beta readiness checks`

This is the single consolidated checklist for ComplyEur private beta launch
readiness. Older audit results and checklists are preserved as audit history,
but go/no-go decisions should be made from this file.

## 1. Executive Summary

ComplyEur is close to private beta but still has open operational and external
verification work. The core app, compliance engine, authenticated baseline
flows, accessibility, mobile checks, build, lint, typecheck, unit tests, and
dependency audit are green based on the latest recorded hardening pass.

The broader launch audit remains at **WARN** because several items cannot be
verified from the repository alone, and several launch operations tasks still
need named owners.

2026-06-15 infrastructure remediation added repo-side controls for compliance
boundary semantics, country centralization, billing permissions, origin checks,
service-role allowlisting, public/internal health separation, CI security
workflows, import parser caps, and import-session retention cleanup. External
dashboard evidence is still required before claiming a 9/10 operational score.

## 2. Current Readiness Status

| Area | Status | Notes |
| --- | --- | --- |
| Core compliance product | Ready for private beta | Compliance-focused suite recorded as passing. |
| Authenticated baseline flows | Ready for private beta | Auth E2E baseline recorded as 49 passed. |
| Accessibility baseline | Ready for private beta | A11y E2E recorded as 17 passed. |
| Mobile baseline | Ready for private beta | Mobile E2E recorded as 15 passed. |
| Billing | Conditional for paid/public beta | Live Stripe prices, production webhook endpoint wiring, and production-like lifecycle/replay/reconciliation evidence are now captured. Billing is no longer a direct blocker, but legal/DNS/recovery work still blocks paid/public release. |
| Operations and recovery | Conditional for private beta | Recovery procedure is documented; public/internal production health is evidenced; no-PITR risk is accepted only for the initial private tester group. Restore-test evidence remains required before broader rollout. |
| Legal and GDPR packaging | Conditional for private beta | DPA package is now repo-ready for legal/DPO review; approval and account-level provider evidence remain public-beta blockers. |
| Monitoring and support | Conditional for private beta | Support ownership, public/internal health, private-beta Sentry issue-alert baseline, production monitoring first-run evidence, and production-like webhook alert-path evidence are now captured. |

## 3. Final Go/No-Go Decision

**Initial private tester recommendation:** Conditional GO after the remaining
critical tester gates below are closed or explicitly risk-accepted by the owner.
The no-PITR recovery risk is accepted only for this initial tester group.

**Broader private beta recommendation:** NO-GO until restore-test evidence,
non-founder onboarding, and remaining manual QA evidence are complete or
separately risk-accepted.

**Paid/public beta recommendation:** NO-GO until legal, DNS, recovery, and
remaining onboarding/deliverability blockers are closed.

## 4. Automated Verification Results

Latest known verification results from the beta hardening pass:

| Check | Result |
| --- | --- |
| Auth E2E baseline | 49 passed |
| A11y E2E | 17 passed |
| Mobile E2E | 15 passed |
| Compliance-focused suite | 552 tests passed |
| Compliance-focused suite, 2026-06-15 | 482 passed |
| Typecheck, 2026-06-15 | Passed |
| Lint, 2026-06-15 | Passed |
| Unit tests, 2026-06-15 | 1530 passed |
| Integration tests, 2026-06-15 | 187 passed |
| Build, 2026-06-15 | Passed, 47 static pages |
| Security check, 2026-06-15 | No known vulnerabilities |
| Multi-user E2E, 2026-06-15 | Command exited 0 but tests skipped; local Supabase unavailable |
| Import E2E, 2026-06-15 | Command exited 0 but tests skipped; auth test setup missing or invalid |
| Unit tests | 1524 passed |
| Typecheck | Passed |
| Lint | Passed |
| Build | Passed, 44 static pages |
| Security check | No known vulnerabilities |
| Whitespace diff check | Clean |
| Baseline commit | `08002bf chore: complete authenticated beta readiness checks` |

Broader launch audit result from `docs/BETA_LAUNCH_RESULTS.md`:

| Metric | Result |
| --- | --- |
| Sections complete | 18 |
| Total pass | 179 |
| Total warn | 68 |
| Total fail | 10 |
| Overall posture | WARN |

## 5. Production And Deploy Checks

Supporting docs:

- `docs/operations/RELEASE-CHECKLIST.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `docs/RUNBOOK.md`
- `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md`
- `docs/operations/BETA_VERIFICATION_AUTOMATION.md`
- `docs/BRANCH_PROTECTION_BASELINE.md`
- `docs/architecture/ENVIRONMENTS.md`
- `docs/architecture/MIGRATION_WORKFLOW.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| CodeQL and dependency-security workflow run evidence | Important before paid/public beta | Engineering owner | New workflow files exist locally; capture GitHub run evidence after they are merged and active. |
| Vercel production env vars, custom domain, SSL, and health endpoint | Complete for paid/public beta | Engineering owner | Evidence stored in `docs/operations/evidence/platform-dashboard/2026-06-16-vercel-supabase-sentry-dashboard-evidence.md`. |
| Production rollback procedure | Important before paid/public beta | Engineering owner | Run tabletop rollback using `docs/RUNBOOK.md`; record evidence. |

## 6. Supabase, RLS, Backups, And PITR Checks

Supporting docs:

- `docs/security/MULTI_TENANT_ISOLATION_AUDIT_2026-02-20.md`
- `docs/security/rls-audit/03-rls-audit-report.md`
- `docs/engineering/adr/ADR-001-multi-tenant-rls-strategy.md`
- `docs/RUNBOOK.md`
- `docs/SOC2_READINESS_AUDIT.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Recovery tabletop and evidence | Risk accepted for initial private testers only; critical before broader rollout | Engineering owner | No-PITR risk acceptance filed for initial testers; execute the `docs/RUNBOOK.md` recovery procedure against an isolated restore target before broader rollout. |
| Supabase production project, RLS, Edge Function, and advisor evidence | Complete for paid/public beta | Engineering owner | Evidence stored in `docs/operations/evidence/platform-dashboard/2026-06-16-vercel-supabase-sentry-dashboard-evidence.md`; repo password policy is hardened to minimum 12 characters plus symbols, but hosted leaked-password protection is plan-blocked unless Supabase is upgraded to Pro or risk-accepted. |
| Supabase production backups and PITR | Risk accepted for initial private testers only; critical before paid/public beta | Engineering owner | No-PITR risk acceptance filed in `docs/operations/evidence/release-approvals/2026-06-16-no-pitr-initial-tester-risk-acceptance.md`; enable backup/PITR coverage and run restore drill before broader rollout, paid beta, or public beta. |
| Fresh staging or production-like RLS attack-test evidence | Important before paid/public beta | Security owner | Run attack plan and file evidence under compliance or security docs. |

## 7. Stripe And Billing Checks

Supporting docs:

- `docs/billing/BETA_PRICING_MODEL.md`
- `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md`
- `docs/BETA_LAUNCH_RESULTS.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Stripe price IDs and webhook endpoint | Complete for paid/public beta | Billing owner | Evidence stored in `docs/operations/evidence/stripe-verification/2026-06-16-stripe-price-webhook-verification.md`. |
| Stripe lifecycle and replay evidence | Complete for paid/public beta | Billing owner | Evidence captured in `docs/operations/evidence/stripe-verification/2026-06-18-stripe-lifecycle-replay-reconciliation-testmode.md`. |
| Billing support path | Important before paid/public beta | Support owner | Confirm payment-failure and subscription-question routing uses the monitored support path. |

## 8. Auth And Account Checks

Supporting docs:

- `docs/BETA_LAUNCH_RESULTS.md`
- `e2e/auth-smoke.spec.ts`
- `e2e/auth-navigation.spec.ts`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Multi-provider auth email delivery | Critical before private beta | QA owner | Production signup confirmation is evidenced for one tested path; run Gmail, Outlook, and corporate inbox checks before broad tester outreach. |
| Password reset link behavior | Critical before private beta | QA owner | Verify reset delivery, link use, expiry, and post-reset sessions. |
| Non-founder full journey | Critical before private beta | Product owner | Run signup through logout with a tester who has not seen the app; use the documented deletion-request path if deletion is part of the test. |

## 9. GDPR, Privacy, And Legal Checks

Supporting docs:

- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
- `docs/legal/DPA_TEMPLATE.md`
- `docs/legal/DPA_READINESS.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/DATA_CLASSIFICATION.md`
- `docs/DATA_DELETION_WORKFLOW.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| DPA package legal approval | Critical before paid/public beta | Legal owner | Review `docs/legal/DPA_TEMPLATE.md` and `docs/legal/DPA_READINESS.md`, confirm legal entity/main agreement terms, then remove draft status before sharing as final. |
| ICO registration evidence | Important before paid/public beta | Legal owner | Confirm registration status and file release evidence. |
| Processor/subprocessor account evidence | Important before paid/public beta | Legal owner | Use `docs/legal/DPA_READINESS.md` to attach account-level DPA/SCC evidence for analytics, consent, anti-abuse, and support tooling. |
| GDPR legal review and provider evidence | Critical before paid/public beta | Privacy owner | Review `docs/legal/PRIVACY_OPERATING_RECORD.md`, `docs/legal/DPA_READINESS.md`, and `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`; attach provider DPA/SCC, hosting, backup, and operational evidence. |

## 10. Monitoring And Support Checks

Supporting docs:

- `docs/compliance/soc2/evidence/uptime_monitoring_evidence.md`
- `docs/SOC2_READINESS_AUDIT.md`
- `docs/RUNBOOK.md`
- `docs/operations/BETA_SUPPORT_AND_ALERTING.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Zero-signup monitoring first-run evidence | Complete for paid/public beta | Growth/analytics owner | Evidence captured in `docs/operations/evidence/2026-06-18-beta-monitoring-first-run.md`. |
| Sentry alert rules | Complete for private beta | Engineering owner | Evidence captured in `docs/operations/evidence/sentry-alerts/2026-06-17-sentry-test-delivery.md`. On 2026-06-17 the required issue-alert baseline was created, the duplicate high-priority rule was removed, and all 9 alert rules sent successful test notifications to the monitored mailbox. Failed Stripe webhook and stale billing-processing alerting remain tracked under Beta Monitoring Cron. |
| Webhook-failure monitoring first-run evidence | Complete for paid/public beta | Billing owner | Evidence captured in `docs/operations/evidence/stripe-verification/2026-06-18-stripe-lifecycle-replay-reconciliation-testmode.md`. |
| Public/internal health evidence | Complete for private beta | Engineering owner | Evidence stored in `docs/operations/evidence/platform-dashboard/2026-06-16-vercel-supabase-sentry-dashboard-evidence.md`. |

## 11. Email And DNS Checks

Supporting docs:

- `docs/GO_LIVE_CHECKLIST.md`
- `docs/BETA_LAUNCH_RESULTS.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| SPF/DKIM/DMARC DNS records | Critical before paid/public beta | Engineering owner | Configure records from the email provider dashboard, verify with `pnpm email:dns:check`, and confirm delivered headers pass. |
| Multi-provider auth email deliverability | Critical before private beta | QA owner | Test Gmail, Outlook, and one corporate provider. |
| Reply-to/support routing | Important before paid/public beta | Support owner | Confirm monitored reply-to address for transactional and alert emails. |

## 12. Known Issues

Current known issues are tracked in `docs/beta/BETA_KNOWN_ISSUES.md`.
Tester onboarding package is prepared in `docs/beta/BETA_TESTER_BRIEF.md`.

Release-critical known issues:

- Stripe price IDs and the production webhook endpoint are verified.
- Stripe lifecycle monitoring and reconciliation evidence are pending.
- Production signup email is evidenced for one tested path; multi-provider deliverability still needs Gmail, Outlook, and corporate inbox testing.
- SPF/DKIM/DMARC setup is pending before paid/public launch.
- Baseline branch protection is evidenced complete; expanded CodeQL/dependency-security workflow run evidence is pending.
- No-PITR risk is accepted only for the initial private tester group; restore
  testing and backup/PITR coverage are still required before broader rollout.
- DPA package is repo-ready but still needs legal/DPO approval and
  account-level subprocessor evidence.
- Real-device iOS Safari and Android Chrome checks are pending.

## 13. Beta Success Metrics

Current success metrics are tracked in `docs/beta/BETA_SUCCESS_METRICS.md`.

Required before beta starts:

| Metric area | Current target | Owner | Next action |
| --- | --- | --- | --- |
| Activation | 40 percent or higher | Product owner | Assign dashboard/reporting owner. |
| Core usage | 50 percent or higher of activated companies | Product owner | Define weekly review cadence. |
| Retention | 30 percent or higher active between days 14 and 21 | Product owner | Decide tracking source. |
| Conversion | 10 percent or higher | Billing owner | Confirm pricing model and billing readiness. |
| Qualitative feedback | At least 1 actionable item per active company | Support owner | Confirm feedback triage process. |

## 14. Manual Checks Still Required

Run `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md` against the
deployed beta URL. The remaining manual checks include:

- Confirmation email delivery in Gmail, Outlook, and a corporate provider.
- Password reset delivery, link use, expiry, and session invalidation.
- Real-device iPhone Safari and Android Chrome checks.
- Ad blocker compatibility for core flows, Stripe, CookieYes, and analytics.
- Lighthouse performance audit on deployed beta URL.
- Screen reader checks with VoiceOver or NVDA.
- Dark-mode email client rendering.
- Full user journey by a non-founder.
- Sentry, Resend, Stripe lifecycle, GitHub workflow, and Supabase backup/PITR
  dashboard checks before broader rollout.

## 15. Critical Blockers

| Blocker | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Multi-provider auth email delivery | Critical before private beta | QA owner | Test Gmail, Outlook, and one corporate provider. |
| Password reset link behavior | Critical before private beta | QA owner | Verify reset delivery, single-use behavior, expiry, and post-reset sessions. |
| Recovery tabletop and evidence | Risk accepted for initial private testers only; critical before broader rollout | Engineering owner | Restore validation is waived only for the initial tester group under the no-PITR risk acceptance; complete before broader rollout. |
| Non-founder full journey | Critical before private beta | Product owner | Run signup through logout with a tester who has not seen the app. |
| Tester brief and known issues must be distributed | Critical before private beta | Product owner | Send `docs/beta/BETA_TESTER_BRIEF.md` and `docs/beta/BETA_KNOWN_ISSUES.md` to testers. |
| Stripe lifecycle and replay evidence | Complete for paid/public beta | Billing owner | Evidence captured in `docs/operations/evidence/stripe-verification/2026-06-18-stripe-lifecycle-replay-reconciliation-testmode.md`. |
| DPA package legal approval | Critical before paid/public beta | Legal owner | Complete review of `docs/legal/DPA_TEMPLATE.md` and `docs/legal/DPA_READINESS.md`. |
| SPF/DKIM/DMARC DNS records | Critical before paid/public beta | Engineering owner | Configure records, run `pnpm email:dns:check`, and verify delivered email headers. |

## 16. High-Priority Non-Blockers

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Beta metrics ownership/tracking pending | Important before paid/public beta | Product owner | Assign dashboard owner and review cadence. |
| Zero-signup monitoring first-run evidence | Complete for paid/public beta | Growth/analytics owner | Evidence captured in `docs/operations/evidence/2026-06-18-beta-monitoring-first-run.md`. |
| CodeQL and dependency-security workflow run evidence pending | Important before paid/public beta | Engineering owner | Capture GitHub run evidence after workflows are active. |
| Supabase backup/PITR dashboard verification | Critical before paid/public beta | Engineering owner | Risk accepted only for the initial private tester group; enable backup/PITR coverage and file restore evidence before broader rollout, paid beta, or public beta. |

## 17. Nice-To-Have Items

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Video walkthrough for beta testers | Nice to have | Product owner | Record short onboarding walkthrough. |
| Compliance threshold tooltips | Nice to have | Product owner | Add explanatory dashboard tooltips. |
| Live cookie scan evidence | Nice to have | Privacy owner | Attach scan before public launch. |
| Competitor/differentiator notes | Nice to have | Product owner | Document for commercial readiness. |

## 18. Owner And Next Action Summary

| Owner | Next action |
| --- | --- |
| Engineering owner | Capture CodeQL/security workflow evidence, run the recovery tabletop, verify Beta Monitoring Cron evidence, and enable/verify Supabase backup/PITR before broader rollout. |
| Billing owner | Complete Stripe lifecycle/replay evidence, confirm reconciliation process, and confirm billing support path. |
| Legal owner | Complete DPA approval, processor/subprocessor account evidence, and ICO evidence. |
| Product owner | Distribute tester brief/known issues, run non-founder journey, assign metrics dashboard owner. |
| QA owner | Complete email, password reset, real-device, screen reader, and ad blocker checks. |
| Support owner | Maintain evidenced support ownership and confirm billing-support routing before paid/public beta. |
| Growth/analytics owner | Verify zero-signup monitoring evidence and maintain the beta metrics review cadence. |

## Supporting Documents

- `docs/BETA_LAUNCH_RESULTS.md` - full 18-section launch audit.
- `docs/BETA_LAUNCH_CHECKLIST.md` - original pre-beta checklist template.
- `docs/beta/BETA_TESTER_BRIEF.md` - tester-facing onboarding and feedback instructions.
- `docs/beta/BETA_KNOWN_ISSUES.md` - tester-facing known issues.
- `docs/beta/BETA_SUCCESS_METRICS.md` - beta metrics and targets.
- `docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md` - deployed-beta manual verification gate.
- `docs/operations/BETA_SUPPORT_AND_ALERTING.md` - support ownership, feedback, and alert baseline.
- `docs/operations/BETA_EVIDENCE_LOG_TEMPLATE.md` - evidence capture template for manual beta sign-off.
- `docs/operations/BETA_VERIFICATION_AUTOMATION.md` - repo-side beta automation coverage and commands.
- `docs/operations/RELEASE-CHECKLIST.md` - historical v1 release workflow and latest local release gate notes.
- `docs/GO_LIVE_CHECKLIST.md` - production go-live checklist.
- `docs/RUNBOOK.md` - deployment, rollback, restore testing, logs, and maintenance mode.
- `docs/INCIDENT_RESPONSE.md` - SOC 2/GDPR incident response process.
- `docs/SOC2_READINESS_AUDIT.md` - SOC 2 readiness evidence and gaps.
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md` - GDPR/UK GDPR public-release workplan.
- `docs/legal/DPA_READINESS.md` - DPA legal approval and subprocessor evidence tracker.
- `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md` - Stripe price and webhook finalization.
