# Beta Release Source Of Truth

## Status

**Authoritative.** This document is the current source of truth for ComplyEur
private beta go/no-go decisions.

- Use this file for readiness status, blockers, owners, and next actions.
- Use supporting documents for execution detail and evidence capture.
- Treat older launch checklists and audit summaries as historical reference
  only.

Last updated: 2026-06-24
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
| Billing | In progress for paid/public beta | Live Stripe payment, price audit, webhook endpoint, and entitlement provisioning are evidenced; lifecycle failure-mode evidence still remains. |
| Operations and recovery | Conditional for private beta | Recovery procedure is now documented; restore-test evidence still remains incomplete. |
| Legal and GDPR packaging | Conditional for private beta | Engineering GDPR package is drafted; DPA/provider terms/legal review and live evidence remain before paid/public beta. |
| Monitoring and support | Conditional for private beta | Support ownership is evidenced; Sentry routing and public/internal health evidence remain open. Metrics ownership and zero-signup alert remain paid/public beta work. |

## 3. Final Go/No-Go Decision

**Private beta recommendation:** Conditional GO after critical private-beta
items below are closed or explicitly risk-accepted by the owner.

**Paid/public beta recommendation:** NO-GO until billing, legal, DNS, recovery,
and monitoring ownership blockers are closed.

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
| Focused multi-user/GDPR/security suite, 2026-06-24 | 15 files passed, 160 tests passed |
| Full Vitest suite, 2026-06-24 | 147 files passed, 2144 tests passed |
| Typecheck, 2026-06-24 | Passed |
| Lint, 2026-06-24 | Passed |
| Build, 2026-06-24 | Passed, 48 static pages |
| Security check, 2026-06-24 | No known vulnerabilities |
| Multi-user E2E, 2026-06-24 | Passed, 2 Playwright tests |
| Production RLS/RPC attack probe, 2026-06-24 | Passed, 13 checks; cleanup verified |
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
| Vercel production env vars, custom domain, SSL, and health endpoint | Important before paid/public beta | Engineering owner | Verify in Vercel dashboard and capture release evidence. |
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
| Recovery tabletop and evidence | Critical before private beta | Engineering owner | Execute the `docs/RUNBOOK.md` recovery procedure against an isolated restore target and file evidence. |
| Supabase production backups and PITR | Important before paid/public beta | Engineering owner | Verify Supabase plan, backups, PITR, and restore target from the dashboard. |
| Fresh staging or production-like RLS attack-test evidence | Complete for current production schema | Security owner | 2026-06-24 production probe passed 13 RLS/RPC checks and cleanup verification; re-run after any Supabase migration or tenant-isolation change. |

## 7. Stripe And Billing Checks

Supporting docs:

- `docs/billing/BETA_PRICING_MODEL.md`
- `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md`
- `docs/BETA_LAUNCH_RESULTS.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Production Stripe price IDs | Complete for current production config | Billing owner | 2026-06-23 live audit passed for all six configured prices; re-run after any pricing change. |
| Stripe webhook endpoint in target environment | Complete for current production endpoint | Billing owner | 2026-06-23 live check passed for `https://complyeur.com/api/billing/webhook`, including refund and dispute events; re-run after endpoint or event changes. |
| Live successful checkout and entitlement provisioning | Complete for happy path | Billing owner | 2026-06-23 live GBP 1 discounted subscription payment processed and app entitlement provisioned. |
| Stripe subscription reconciliation | Complete for current production subscriptions | Billing owner | 2026-06-23 reconciliation refreshed two active Stripe subscriptions and filled the tested checkout `current_period_end`; run `scripts/reconcileStripeSubscriptions.ts` after missed events. |
| Stripe lifecycle and replay evidence | Critical before paid/public beta | Billing owner | Deploy the updated handler, then capture webhook replay, stale-processing, out-of-order, failed-payment, cancellation, and post-deploy lifecycle evidence. |
| Billing support path | Important before paid/public beta | Support owner | Refund and dispute alert code is in place; confirm delivery to the monitored billing/support mailbox after deploy. |

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
- `docs/legal/PROCESSOR_SUBPROCESSOR_REGISTER.md`
- `docs/legal/ARTICLE_30_RECORD_OF_PROCESSING.md`
- `docs/legal/DATA_SUBJECT_RIGHTS_PROCESS.md`
- `docs/legal/RETENTION_SCHEDULE.md`
- `docs/legal/DPIA_TRIGGER_CHECKLIST.md`
- `docs/legal/LEGITIMATE_INTEREST_ASSESSMENT_TEMPLATE.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/DATA_CLASSIFICATION.md`
- `docs/DATA_DELETION_WORKFLOW.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| DPA template still marked draft | Critical before paid/public beta | Legal owner | Complete legal review and remove draft status before sharing as final. |
| ICO registration evidence | Important before paid/public beta | Legal owner | Confirm registration status and file release evidence. |
| Processor/subprocessor register legal confirmation | Important before paid/public beta | Legal owner | Register now exists; confirm provider roles, DPA/SCC/UK transfer terms, and account-region settings for Supabase, Vercel, Stripe, Resend, Sentry, GA4, CookieYes, Cloudflare Turnstile, and Upstash. |
| Public GDPR release workplan remaining P0/P1 items | Critical before paid/public beta | Privacy owner | Close remaining erasure/anonymisation evidence, lawful-basis legal review, transfer confirmation, and security evidence links in `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`. |
| Live privacy and cookie evidence | Important before paid/public beta | Privacy owner | Run production cookie scan and confirm CookieYes reject/withdraw paths prevent GA cookies/scripts/events. |

## 10. Monitoring And Support Checks

Supporting docs:

- `docs/compliance/soc2/evidence/uptime_monitoring_evidence.md`
- `docs/SOC2_READINESS_AUDIT.md`
- `docs/RUNBOOK.md`
- `docs/operations/BETA_SUPPORT_AND_ALERTING.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Zero-signup alert not implemented | Important before paid/public beta | Growth/analytics owner | Define signup inactivity window and add alerting or dashboard review. |
| Sentry alert rules | Critical before private beta | Engineering owner | Configure or verify the alert baseline in `docs/operations/BETA_SUPPORT_AND_ALERTING.md` and capture evidence. |
| Webhook-failure monitoring | Important before paid/public beta | Billing owner | Confirm alerting for failed Stripe webhook events. |
| Public/internal health evidence | Critical before private beta | Engineering owner | Capture current public `/api/health` and protected `/api/internal/health` evidence for the deployed environment. |

## 11. Email And DNS Checks

Supporting docs:

- `docs/GO_LIVE_CHECKLIST.md`
- `docs/BETA_LAUNCH_RESULTS.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| SPF/DKIM/DMARC DNS records | Critical before paid/public beta | Engineering owner | Configure records from the email provider dashboard and verify headers. |
| Multi-provider auth email deliverability | Critical before private beta | QA owner | Test Gmail, Outlook, and one corporate provider. |
| Reply-to/support routing | Important before paid/public beta | Support owner | Confirm monitored reply-to address for transactional and alert emails. |

## 12. Known Issues

Current known issues are tracked in `docs/beta/BETA_KNOWN_ISSUES.md`.
Tester onboarding package is prepared in `docs/beta/BETA_TESTER_BRIEF.md`.

Release-critical known issues:

- Stripe price IDs are synced and audited for current live billing.
- Stripe lifecycle replay, failure-mode, cancellation, and post-deploy alert evidence remain pending.
- Production signup email is evidenced for one tested path; multi-provider deliverability still needs Gmail, Outlook, and corporate inbox testing.
- SPF/DKIM/DMARC setup is pending before paid/public launch.
- Baseline branch protection is evidenced complete; expanded CodeQL/dependency-security workflow run evidence is pending.
- Disaster-recovery testing and evidence are pending.
- DPA, processor/subprocessor, transfer, and lawful-basis materials need legal review.
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
- Vercel, Supabase, Sentry, Resend, Stripe, and GitHub dashboard checks.

## 15. Critical Blockers

| Blocker | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Multi-provider auth email delivery | Critical before private beta | QA owner | Test Gmail, Outlook, and one corporate provider. |
| Password reset link behavior | Critical before private beta | QA owner | Verify reset delivery, single-use behavior, expiry, and post-reset sessions. |
| Recovery tabletop and evidence | Critical before private beta | Engineering owner | Execute the documented restore and validation flow and store evidence. |
| Non-founder full journey | Critical before private beta | Product owner | Run signup through logout with a tester who has not seen the app. |
| Sentry alert routing evidence | Critical before private beta | Engineering owner | Capture Sentry alert rules, notification destinations, recipients, and test alert delivery. |
| Public/internal health evidence | Critical before private beta | Engineering owner | Capture public `/api/health` and protected `/api/internal/health` evidence for the deployed environment. |
| Tester brief and known issues must be distributed | Critical before private beta | Product owner | Send `docs/beta/BETA_TESTER_BRIEF.md` and `docs/beta/BETA_KNOWN_ISSUES.md` to testers. |
| Stripe lifecycle and failure-mode evidence | Critical before paid/public beta | Billing owner | Capture replay, stale/out-of-order, failed-payment, cancellation, failed-webhook monitoring, reconciliation, and `current_period_end` evidence. |
| DPA template still marked draft | Critical before paid/public beta | Legal owner | Complete legal review. |
| SPF/DKIM/DMARC DNS records | Critical before paid/public beta | Engineering owner | Configure and verify DNS/email headers. |

## 16. High-Priority Non-Blockers

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Beta metrics ownership/tracking pending | Important before paid/public beta | Product owner | Assign dashboard owner and review cadence. |
| Zero-signup alert not implemented | Important before paid/public beta | Growth/analytics owner | Implement alert or documented manual review. |
| CodeQL and dependency-security workflow run evidence pending | Important before paid/public beta | Engineering owner | Capture GitHub run evidence after workflows are active. |
| Supabase backup/PITR dashboard verification | Important before paid/public beta | Engineering owner | Verify and store evidence. |

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
| Engineering owner | Capture CodeQL/security workflow evidence, run the recovery tabletop, confirm Sentry alerts, capture health evidence, and verify Supabase backup/PITR plus production dashboard settings. |
| Billing owner | Replace Stripe price IDs, validate webhook endpoint, confirm billing support path. |
| Legal owner | Complete DPA review, processor/subprocessor register review, ICO evidence. |
| Product owner | Distribute tester brief/known issues, run non-founder journey, assign metrics dashboard owner. |
| QA owner | Complete email, password reset, real-device, screen reader, and ad blocker checks. |
| Support owner | Maintain evidenced support ownership and confirm billing-support routing before paid/public beta. |
| Growth/analytics owner | Define and implement signup inactivity alert or manual monitoring process. |

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
- `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md` - Stripe price and webhook finalization.
