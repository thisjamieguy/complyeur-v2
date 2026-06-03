# Beta Release Source Of Truth

Last updated: 2026-06-04
Current branch: `codex/consolidate-release-audits`
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

## 2. Current Readiness Status

| Area | Status | Notes |
| --- | --- | --- |
| Core compliance product | Ready for private beta | Compliance-focused suite recorded as passing. |
| Authenticated baseline flows | Ready for private beta | Auth E2E baseline recorded as 49 passed. |
| Accessibility baseline | Ready for private beta | A11y E2E recorded as 17 passed. |
| Mobile baseline | Ready for private beta | Mobile E2E recorded as 15 passed. |
| Billing | Blocked for paid/public beta | Placeholder Stripe price IDs still need live/test-live replacement and audit. |
| Operations and recovery | Conditional for private beta | Restore/recovery documentation and restore test evidence remain incomplete. |
| Legal and GDPR packaging | Conditional for private beta | DPA remains draft; GDPR public release workplan still has public-release blockers. |
| Monitoring and support | Conditional for private beta | Uptime/Sentry evidence exists, but business metrics ownership and zero-signup alert are open. |

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
- `docs/BRANCH_PROTECTION_BASELINE.md`
- `docs/architecture/ENVIRONMENTS.md`
- `docs/architecture/MIGRATION_WORKFLOW.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Branch protection on `main` not verified | Critical before private beta | Engineering owner | Confirm GitHub settings match `docs/BRANCH_PROTECTION_BASELINE.md`. |
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
| Data corruption recovery plan/runbook | Critical before private beta | Engineering owner | Add explicit corruption detection, restore, validation, and RLS re-check steps to the operational runbook. |
| Recovery runbook needed | Critical before private beta | Engineering owner | Fold the restore plan into `docs/RUNBOOK.md` or a dedicated linked recovery runbook. |
| Supabase production backups and PITR | Important before paid/public beta | Engineering owner | Verify Supabase plan, backups, PITR, and restore target from the dashboard. |
| Fresh staging or production-like RLS attack-test evidence | Important before paid/public beta | Security owner | Run attack plan and file evidence under compliance or security docs. |

## 7. Stripe And Billing Checks

Supporting docs:

- `docs/billing/BETA_PRICING_MODEL.md`
- `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md`
- `docs/BETA_LAUNCH_RESULTS.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Placeholder Stripe price IDs | Critical before paid/public beta | Billing owner | Create products/prices, sync IDs into `tiers`, and audit with the existing Stripe scripts. |
| Stripe webhook endpoint in target environment | Critical before paid/public beta | Billing owner | Configure or validate webhook endpoint for the deployed beta URL. |
| Billing support path | Important before paid/public beta | Support owner | Confirm support inbox ownership for payment failures and subscription questions. |

## 8. Auth And Account Checks

Supporting docs:

- `docs/BETA_LAUNCH_RESULTS.md`
- `e2e/auth-smoke.spec.ts`
- `e2e/auth-navigation.spec.ts`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Auth email delivery across Gmail, Outlook, and corporate providers | Critical before private beta | QA owner | Run manual delivery tests against the beta environment. |
| Password reset link behavior | Critical before private beta | QA owner | Verify reset delivery, link use, expiry, and post-reset sessions. |
| Non-founder full journey | Critical before private beta | Product owner | Run signup through logout with a tester who has not seen the app. |

## 9. GDPR, Privacy, And Legal Checks

Supporting docs:

- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`
- `docs/legal/DPA_TEMPLATE.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/DATA_CLASSIFICATION.md`
- `docs/DATA_DELETION_WORKFLOW.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| DPA template still marked draft | Critical before paid/public beta | Legal owner | Complete legal review and remove draft status before sharing as final. |
| ICO registration evidence | Important before paid/public beta | Legal owner | Confirm registration status and file release evidence. |
| Processor/subprocessor register review | Important before paid/public beta | Legal owner | Confirm DPA/SCC status for analytics, consent, anti-abuse, and support tooling. |
| Public GDPR release workplan P0/P1 items | Critical before paid/public beta | Privacy owner | Work through `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`. |

## 10. Monitoring And Support Checks

Supporting docs:

- `docs/compliance/soc2/evidence/uptime_monitoring_evidence.md`
- `docs/SOC2_READINESS_AUDIT.md`
- `docs/RUNBOOK.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Zero-signup alert not implemented | Important before paid/public beta | Growth/analytics owner | Define signup inactivity window and add alerting or dashboard review. |
| Sentry alert rules | Critical before private beta | Engineering owner | Confirm error spike alerts and notification recipients in Sentry. |
| Support inbox ownership | Critical before private beta | Support owner | Assign owner and response cadence for beta feedback and support. |
| Webhook-failure monitoring | Important before paid/public beta | Billing owner | Confirm alerting for failed Stripe webhook events. |

## 11. Email And DNS Checks

Supporting docs:

- `docs/GO_LIVE_CHECKLIST.md`
- `docs/BETA_LAUNCH_RESULTS.md`

Open checks:

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| SPF/DKIM/DMARC DNS records | Critical before paid/public beta | Engineering owner | Configure records from the email provider dashboard and verify headers. |
| Auth email deliverability | Critical before private beta | QA owner | Test Gmail, Outlook, and one corporate provider. |
| Reply-to/support routing | Important before paid/public beta | Support owner | Confirm monitored reply-to address for transactional and alert emails. |

## 12. Known Issues

Current known issues are tracked in `docs/beta/BETA_KNOWN_ISSUES.md`.

Release-critical known issues:

- Stripe price IDs must be synced and audited before live billing.
- Auth and alert email deliverability still needs provider testing.
- SPF/DKIM/DMARC setup is pending before paid/public launch.
- Branch protection must be verified.
- Disaster-recovery testing and evidence are pending.
- DPA and processor/subprocessor materials need legal review.
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
| Branch protection on `main` not verified | Critical before private beta | Engineering owner | Verify GitHub settings. |
| Data corruption recovery plan/runbook | Critical before private beta | Engineering owner | Document restore and data-integrity validation flow. |
| Recovery runbook needed | Critical before private beta | Engineering owner | Add or link the runbook from release docs. |
| Known issues list must be shared with testers | Critical before private beta | Product owner | Send or publish `docs/beta/BETA_KNOWN_ISSUES.md` for beta testers. |
| Placeholder Stripe price IDs | Critical before paid/public beta | Billing owner | Replace and audit IDs. |
| DPA template still marked draft | Critical before paid/public beta | Legal owner | Complete legal review. |
| SPF/DKIM/DMARC DNS records | Critical before paid/public beta | Engineering owner | Configure and verify DNS/email headers. |

## 16. High-Priority Non-Blockers

| Item | Classification | Owner | Next action |
| --- | --- | --- | --- |
| Missing 404 page | Important before paid/public beta | Engineering owner | Add branded `not-found.tsx`. |
| Beta metrics ownership/tracking pending | Important before paid/public beta | Product owner | Assign dashboard owner and review cadence. |
| Zero-signup alert not implemented | Important before paid/public beta | Growth/analytics owner | Implement alert or documented manual review. |
| Sentry alert rules not evidenced | Important before paid/public beta | Engineering owner | Capture alert configuration evidence. |
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
| Engineering owner | Verify branch protection, recovery runbook, Sentry alerts, Supabase backup/PITR, production dashboard settings. |
| Billing owner | Replace Stripe price IDs, validate webhook endpoint, confirm billing support path. |
| Legal owner | Complete DPA review, processor/subprocessor register review, ICO evidence. |
| Product owner | Share known issues, run non-founder journey, assign metrics dashboard owner. |
| QA owner | Complete email, password reset, real-device, screen reader, and ad blocker checks. |
| Support owner | Confirm support inbox, beta feedback owner, and response cadence. |
| Growth/analytics owner | Define and implement signup inactivity alert or manual monitoring process. |

## Supporting Documents

- `docs/BETA_LAUNCH_RESULTS.md` - full 18-section launch audit.
- `docs/BETA_LAUNCH_CHECKLIST.md` - original pre-beta checklist template.
- `docs/beta/BETA_KNOWN_ISSUES.md` - tester-facing known issues.
- `docs/beta/BETA_SUCCESS_METRICS.md` - beta metrics and targets.
- `docs/operations/RELEASE-CHECKLIST.md` - historical v1 release workflow and latest local release gate notes.
- `docs/GO_LIVE_CHECKLIST.md` - production go-live checklist.
- `docs/RUNBOOK.md` - deployment, rollback, restore testing, logs, and maintenance mode.
- `docs/INCIDENT_RESPONSE.md` - SOC 2/GDPR incident response process.
- `docs/SOC2_READINESS_AUDIT.md` - SOC 2 readiness evidence and gaps.
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md` - GDPR/UK GDPR public-release workplan.
- `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md` - Stripe price and webhook finalization.
