# Beta Evidence Status Dashboard

Last updated: 2026-06-18
Last updated: 2026-06-23

## Purpose

This dashboard is the single tracker for beta readiness evidence.

- Evidence collection: Track screenshots, verification notes, and operational proof for each beta readiness area.
- Release readiness tracking: Show which beta blockers have complete evidence before tester invites or release decisions.
- Operational verification: Confirm that required controls, workflows, alerting, billing, support ownership, and recovery processes have been checked and documented.

## Rules

Before marking any beta blocker complete:

1. Screenshot captured
2. Evidence markdown created
3. Evidence stored in correct folder
4. Tracker updated

## Beta Evidence Table

| Area | Status | Screenshot | Evidence Note | Folder |
|--------|--------|--------|--------|--------|
| Branch Protection | 🟩 Complete | `2026-06-04-branch-protection-enabled.png`, `2026-06-04-required-checks-enabled.png`, `2026-06-04-pull-request-protection-enabled.png` | `2026-06-04-branch-protection-after-fix.md` | `docs/operations/evidence/branch-protection/` |
| Signup Email Verification | 🟩 Complete | `2026-06-05-check-email-page.png`, `2026-06-05-confirmation-email-received.png`, `2026-06-05-confirmation-link-login.png`, `2026-06-05-dashboard-access.png`; prior signup-fix evidence preserved | `2026-06-04-email-verification.md`, `2026-06-04-me-user-removal-before.md`, `2026-06-04-me-user-removal-after.md` | `docs/operations/evidence/email-verification/` |
| Multi-Provider Email Deliverability | 🟨 In Progress | One production signup path evidenced; Gmail, Outlook, and corporate inbox evidence pending | Pending provider-specific note | `docs/operations/evidence/email-verification/` |
| Password Reset | 🟨 In Progress | `Screenshot 2026-06-17 at 23.22.56.png`, `Screenshot 2026-06-17 at 23.23.09.png`, `Screenshot 2026-06-17 at 23.23.13.png`, `Screenshot 2026-06-17 at 23.23.15.png` | `2026-06-17-password-reset-delivery-failure.md` | `docs/operations/evidence/password-reset/` |
| Recovery Drill | 🟨 Risk Accepted | Restore drill waived only for the initial private tester group under no-PITR risk acceptance; required before broader rollout | `2026-06-16-no-pitr-initial-tester-risk-acceptance.md` | `docs/operations/evidence/release-approvals/`, `docs/operations/evidence/recovery-drills/` |
| Non-Founder Onboarding | ⬜ Not Started | Founder simulation screenshots captured; non-founder evidence pending | `2026-06-05-founder-simulation-onboarding.md` founder simulation only | `docs/operations/evidence/beta-onboarding/` |
| Sentry Alert Routing | 🟩 Complete | `2026-06-04-sentry-project-settings-blocked.png`, `2026-06-04-sentry-alert-rules-blocked.png`, `2026-06-04-sentry-notification-routing-blocked.png`, `Screenshot 2026-06-17 at 23.10.14.png`; API output and live mailbox delivery evidence captured | `2026-06-04-sentry-alert-routing.md`, `2026-06-16-sentry-production-issues-api-check.md`, `2026-06-17-sentry-org-token-api-check.md`, `2026-06-17-sentry-alert-rules-api-check.md`, `2026-06-17-sentry-test-delivery.md` | `docs/operations/evidence/sentry-alerts/` |
| Support Ownership | 🟩 Complete | `2026-06-04-support-mailbox.png`, `2026-06-04-support-routing.png`, `2026-06-04-support-address-configuration.png` | `2026-06-04-support-ownership.md` | `docs/operations/evidence/support-ownership/` |
| Beta Monitoring Cron | 🟩 Complete | Production no-alert first-run plus local alert-path evidence captured | `2026-06-18-beta-monitoring-first-run.md`, `2026-06-18-stripe-lifecycle-replay-reconciliation-testmode.md` | `docs/operations/evidence/`, `docs/operations/evidence/stripe-verification/` |
| Stripe Verification | 🟩 Complete | Production webhook configuration plus production-like lifecycle/replay/reconciliation evidence captured | `2026-06-16-stripe-price-webhook-verification.md`, `2026-06-18-stripe-lifecycle-replay-reconciliation-testmode.md` | `docs/operations/evidence/stripe-verification/` |
| Stripe Verification | 🟨 In Progress | API evidence captured; dashboard screenshots still optional/pending | `2026-06-23-live-stripe-payment-evidence.md` | `docs/operations/evidence/stripe-verification/` |
| CodeQL And Dependency Security | 🟨 In Progress | Pending GitHub run evidence | `.github/workflows/codeql.yml`, `.github/workflows/security.yml`, and `.github/dependabot.yml` added locally; dashboard evidence pending | `docs/operations/evidence/branch-protection/` |
| Platform Dashboard | 🟨 In Progress | CLI/API evidence captured; Sentry issue read access verified but alert routing still pending; Supabase backup/PITR risk accepted only for the initial tester group | `2026-06-16-vercel-supabase-sentry-dashboard-evidence.md` | `docs/operations/evidence/platform-dashboard/` |
| Public/Internal Health | 🟩 Complete | CLI/API evidence note | `2026-06-16-vercel-supabase-sentry-dashboard-evidence.md` confirms public and protected production health | `docs/operations/evidence/platform-dashboard/` |
| Supabase Backup/PITR Restore Drill | 🟨 Risk Accepted | Accepted only for the initial private tester group; CLI reports `pitr_enabled: false` and no listed physical backups | `2026-06-16-no-pitr-initial-tester-risk-acceptance.md`, `2026-06-16-vercel-supabase-sentry-dashboard-evidence.md` | `docs/operations/evidence/release-approvals/`, `docs/operations/evidence/recovery-drills/`, `docs/operations/evidence/platform-dashboard/` |
| GDPR/DSAR Lifecycle | 🟨 In Progress | Pending reviewer sign-off | Import raw PII retention was broadened in code; full DSAR and backup limitation evidence pending | `docs/operations/evidence/` |

## Status Legend

⬜ Not Started

🟨 In Progress

🟨 Risk Accepted

🟩 Complete

🚫 Blocked

## Screenshot Requirements

### Branch Protection

- Required screenshots: GitHub protected branch settings, required status checks, required review settings, and admin bypass restrictions if configured.
- Baseline required checks must include `validate`, `tenant-isolation`, and `e2e-baseline`, with strict up-to-date branch enforcement and disabled force pushes/deletions.
- Folder: `docs/operations/evidence/branch-protection/`

### CodeQL And Dependency Security

- Required screenshots: GitHub workflow runs for CodeQL and dependency/security audit jobs after those workflows are active on the protected branch.
- Folder: `docs/operations/evidence/branch-protection/`

### Signup Email Verification

- Required screenshots: Signup verification email delivered for the tested production path, confirmation link use, and successful verified-account state.
- Folder: `docs/operations/evidence/email-verification/`

### Multi-Provider Email Deliverability

- Required screenshots: Verification or auth email delivered to Gmail, Outlook, and a corporate inbox where available; spam or junk folder review; successful link behavior for at least one provider.
- Folder: `docs/operations/evidence/email-verification/`

### Password Reset

- Required screenshots: Password reset request confirmation, reset email delivery, successful password reset, expired or reused token behavior where tested, and post-reset session behavior.
- Folder: `docs/operations/evidence/password-reset/`

### Recovery Drill

- Required screenshots: Backup or restore control panel, recovery drill execution record, restore verification result, and any incident or follow-up tracker used during the drill.
- Required note must include restore target, restore point, critical-table row counts, RLS validation, auth smoke, app smoke, executor, reviewer, and residual risk.
- Folder: `docs/operations/evidence/recovery-drills/`

### Non-Founder Onboarding

- Required screenshots: Beta invite or signup start, email verification, first login, onboarding completion, first employee or trip creation, and final usable dashboard state.
- Folder: `docs/operations/evidence/beta-onboarding/`

### Sentry Alert Routing

- Required screenshots: Sentry alert rule configuration, notification channel routing, test alert delivery, and monitoring owner or escalation target.
- Required rules include production error spike, new auth/billing/import/GDPR issue, regressed issue after deploy, failed billing/webhook signal, and repeated-auth-failure signal.
- Folder: `docs/operations/evidence/sentry-alerts/`

### Support Ownership

- Required screenshots: Support owner assignment, escalation path, response target or support rota, and tested support channel delivery where available.
- Folder: `docs/operations/evidence/support-ownership/`

### Stripe Verification

- Required screenshots: Stripe webhook endpoint health, successful checkout or billing verification, subscription lifecycle event, and failed payment or webhook monitoring where tested.
- Required evidence includes webhook replay, stale-processing, out-of-order event, failed-payment, cancellation, and reconciliation behavior before paid/public beta.
- Folder: `docs/operations/evidence/stripe-verification/`

## Evidence Notes

### Branch Protection

- 2026-06-04 initial live GitHub REST API evidence returned `protected: false` for `main`; failed evidence is preserved in `docs/operations/evidence/branch-protection/`.
- 2026-06-04 after-fix live GitHub REST API evidence returned `protected: true` for `main`.
- Required checks `validate`, `tenant-isolation`, and `e2e-baseline` are required with strict up-to-date branch enforcement.
- Pull request protection, administrator enforcement, conversation resolution, disabled force pushes, and disabled branch deletions are enabled.
- Branch Protection is complete for the beta evidence tracker.

### Support Ownership

- 2026-06-04 support ownership record assigns James Walsh as beta support owner.
- Primary beta support channel is `support@complyeur.com`.
- Public DNS shows production MX records for `complyeur.com` through IONOS and SPF includes Resend.
- Repository email services use `support@complyeur.com` as the default `EMAIL_REPLY_TO` fallback.
- Routing is documented as founder-monitored support; no forwarding rule is required for beta.
- Provider-console forwarding screenshots were not available in this environment; the evidence note records direct mailbox monitoring instead.

### Beta Monitoring Cron

- 2026-06-16 repo update added `/api/cron/beta-monitoring`, scheduled daily in
  `vercel.json`, to alert the monitored operations recipient when no companies
  are created during the configured signup window.
- 2026-06-16 repo update expanded the same cron to alert on failed Stripe
  webhook events in the configured window and stale processing webhook rows.
- 2026-06-18 repo helper `pnpm beta:monitoring:check -- --base-url https://your-beta-url`
  was added to call the protected endpoint with `CRON_SECRET`, validate the
  JSON response, and write a dated first-run evidence note without storing
  secrets.
- 2026-06-18 production first-run evidence was captured against
  `https://complyeur.com`; the protected endpoint returned HTTP 200 with
  `zeroSignupAlert=false`, `webhookAlert=false`, and the helper wrote
  `docs/operations/evidence/2026-06-18-beta-monitoring-first-run.md`.
- 2026-06-18 production-like alert-path evidence was captured during the Stripe
  lifecycle run; `webhookAlert=true` and `webhookAlertSent=true` were recorded
  after a real failed webhook row was introduced and before reconciliation
  replay cleared it.
- Beta Monitoring Cron is complete for the current readiness tracker.

### Stripe Verification

- 2026-06-16 live Stripe connector search confirmed all six active GBP self-serve
  prices exist and match the repo pricing model.
- 2026-06-16 production dry-run sync found no tier updates required.
- 2026-06-16 production audit found six valid prices and zero invalid prices.
- 2026-06-16 production webhook check confirmed endpoint
  `https://complyeur.com/api/billing/webhook` is configured with the required
  event set.
- 2026-06-18 the billing webhook was hardened to persist the latest applied
  Stripe event metadata on `company_entitlements` and ignore older lifecycle
  events instead of allowing stale `customer.subscription.updated` or
  `customer.subscription.deleted` webhooks to overwrite fresher entitlement
  state.
- 2026-06-18 production migrations were applied, the production deploy was
  refreshed, `pnpm billing:webhook:check` confirmed the live endpoint
  configuration on `https://complyeur.com`, and
  `docs/operations/evidence/stripe-verification/2026-06-18-stripe-lifecycle-replay-reconciliation-testmode.md`
  captured real Stripe test-mode evidence for replay, failed-payment,
  cancellation, stale-event ordering, webhook-failure monitoring, and
  reconciliation.
- During that work, `app/api/billing/webhook/route.ts` was corrected to resolve
  payment-failed recipients from company profiles instead of the non-existent
  `companies.email` column.
- Stripe Verification is complete for the current readiness tracker.

### Signup Email Verification

- 2026-06-04 repository review confirmed signup, password reset, and transactional welcome email paths are present for production.
- 2026-06-04 production Supabase investigation and guarded resets for `jamie.guy@me.com` are preserved in `docs/operations/evidence/email-verification/`.
- 2026-06-04 fresh production signup for `jamie.guy@me.com` created an unconfirmed Supabase Auth user and recorded `confirmation_sent_at=2026-06-04T22:55:42.132514+00:00`, but the browser displayed a production-redacted Server Components toast. Screenshot stored as `2026-06-04-me-signup-server-components-warning.png`.
- 2026-06-04 Sentry email alert `5c5bef6a519340b4abfcfa42f4debb26` captured `DatabaseError: You do not have permission to perform this action` on production `/signup` at `2026-06-04T22:55:43Z`; PDF stored as `2026-06-04-sentry-signup-database-permission-alert.pdf`. Root cause: the email signup Server Action retried `create_company_and_profile` from an anonymous request after `signUp`, while the RPC is intentionally not executable by `anon`; the Auth trigger had already provisioned the company/profile.
- 2026-06-05 focused signup fix deployed to production from commit `0f82061` as Vercel deployment `dpl_7ifb4odhpud5Ar7q7tmbhtVu45in`, aliased to `https://complyeur.com`; `/signup` and `/api/health` returned HTTP 200 after deploy.
- 2026-06-05 final production signup for `jamie.guy@me.com` completed end-to-end: confirmation email delivered, confirmation link worked, account activated, Stripe checkout launched, billing completed, MFA setup completed, and protected dashboard access achieved.
- Evidence screenshots stored: `2026-06-05-check-email-page.png`, `2026-06-05-confirmation-email-received.png`, `2026-06-05-confirmation-link-login.png`, and `2026-06-05-dashboard-access.png`.
- Signup Email Verification is complete for the beta evidence tracker.

### Multi-Provider Email Deliverability

- Multi-provider deliverability is not complete.
- Existing evidence proves one production signup path, but not Gmail, Outlook, and corporate-provider coverage.
- Keep this item open until provider-specific delivery evidence is captured or explicitly risk-accepted for a smaller private beta cohort.

### Non-Founder Onboarding

- 2026-06-05 founder-performed production onboarding simulation for `jamie.guy@me.com` completed signup, email verification, billing, team invite, MFA setup, and dashboard access.
- Evidence note stored as `docs/operations/evidence/beta-onboarding/2026-06-05-founder-simulation-onboarding.md`.
- This does not close the Non-Founder Onboarding blocker because the tester was James Walsh.

### Sentry Alert Routing

- 2026-06-04 verification found Sentry production environment variables present in Vercel for `james-walsh/complyeur`.
- Live Sentry project settings, environments, alert rules, notification destinations, and recipients could not be verified because the configured production `SENTRY_AUTH_TOKEN` returned `403 Forbidden` for read-only Sentry project API access.
- 2026-06-16 initial re-check confirmed Sentry production environment variables still exist in Vercel, but the configured production token returned `403 Forbidden` for read-only production issue access.
- 2026-06-16 follow-up with a newly created read-capable personal token succeeded for the production issues API and returned `[]` for unresolved production issues in the last 24 hours.
- 2026-06-17 direct Vercel production env pull plus read-only Sentry API checks against project and organization alert endpoints returned `401 Invalid org token` for the production `SENTRY_AUTH_TOKEN`; sanitized output is stored in `2026-06-17-sentry-org-token-api-output.json`.
- 2026-06-17 operator-created personal token successfully read Sentry rule inventory. The initial inventory showed one active high-priority issue notification rule, one disabled uptime rule targeting `https://complyeur-gold-rc.onrender.com`, no organization monitors, and no separate organization alert-rules entries.
- 2026-06-17 the operator created the required private-beta issue-alert set, removed a duplicate high-priority rule, and confirmed the final active inventory contains 9 issue-alert rules.
- 2026-06-17 all 9 alert rules sent successful test notifications to the monitored mailbox; evidence is recorded in `docs/operations/evidence/sentry-alerts/2026-06-17-sentry-test-delivery.md`.
- Sentry ownership is documented in `docs/operations/SENTRY_OWNERSHIP.md`.
- Sentry Alert Routing is complete for the private-beta issue-alert baseline. Failed Stripe webhook and stale billing-processing alerting remain tracked under the separate Beta Monitoring Cron evidence item.

### Platform Dashboard

- 2026-06-16 Vercel CLI evidence confirmed the `complyeur` production deployment
  is `Ready`, aliased to `https://complyeur.com` and `https://www.complyeur.com`,
  and has expected encrypted production environment-variable names.
- 2026-06-16 TLS check confirmed `complyeur.com` serves a valid Let's Encrypt
  certificate for `complyeur.com` over TLS 1.3.
- 2026-06-16 public health returned `{"status":"ok"}` from
  `https://complyeur.com/api/health`.
- 2026-06-16 protected internal health returned
  `{"status":"ok","checks":{"ping":"ok"}}` when called with the production
  cron secret loaded locally without printing it.
- 2026-06-16 Supabase connector evidence confirmed `complyeur-prod`
  (`bewydxxynjtfpytunlcq`) is `ACTIVE_HEALTHY`, all listed `public` and
  `storage` tables have RLS enabled, and the `auth-hook-prevent-linking` Edge
  Function is active.
- Supabase security advisors report one warning: leaked password protection is
  disabled.
- 2026-06-16 repo-side password policy was hardened to require at least 12
  characters and a symbol in Supabase local config plus app signup, reset, and
  account password-change validation; targeted auth tests passed.
- Supabase leaked password protection remains disabled in the hosted project and
  still requires a Pro-or-higher plan plus dashboard enablement or explicit risk
  acceptance. Screenshot evidence:
  `docs/operations/evidence/platform-dashboard/2026-06-16-supabase-leaked-password-protection-plan-blocked.png`.
- 2026-06-16 `supabase backups list` reported `pitr_enabled: false`, `walg_enabled: true`,
  no listed physical backups, and no physical backup metadata. Backup/PITR
  evidence is blocked until backup/PITR coverage is enabled or risk-accepted.
- 2026-06-16 James Walsh accepted the no-PITR risk for the initial private
  tester group only. Evidence:
  `docs/operations/evidence/release-approvals/2026-06-16-no-pitr-initial-tester-risk-acceptance.md`.
- This risk acceptance expires before broader rollout, paid beta, public beta,
  enterprise trials, or 2026-07-16, whichever comes first.

### Stripe Verification

- 2026-06-23 live Stripe API evidence confirms the account has charges and payouts enabled.
- A live `GBP 1.00` discounted subscription checkout completed successfully in live mode.
- Production Stripe price audit passed for all six configured price IDs, including amount, currency, interval, and active-status checks against the local plan catalog.
- The live webhook endpoint for `https://complyeur.com/api/billing/webhook` is enabled and matches the repo-required event set, including refund and dispute events.
- Production Supabase evidence confirms the checkout webhook was processed and provisioned the expected `professional` active entitlement.
- Production reconciliation on 2026-06-23 refreshed two active Stripe subscriptions and filled the tested checkout entitlement `current_period_end`.
- Code changes now retrieve `current_period_end` during checkout provisioning, source renewal-email amounts from Stripe invoice previews, alert billing/support on refunds and disputes, refresh entitlements when tier capabilities change, and provide a repeatable reconciliation script.
- Stripe Verification remains in progress until the updated handler is deployed and replay, stale/out-of-order event, failed-payment, cancellation, failed-webhook monitoring, and post-deploy lifecycle evidence are closed.

## Release Progress Summary

### Critical Evidence Areas Complete

5 complete:

- Branch Protection
- Sentry Alert Routing
- Signup Email Verification
- Public/Internal Health
- Support Ownership

### Private Beta Evidence Blockers Remaining

3 remaining:

- Multi-Provider Email Deliverability
- Password Reset
- Non-Founder Onboarding

Tester brief and known-issues distribution is tracked in
`docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md` because it is a communication
task rather than an operational evidence area.

### Paid/Public Beta Evidence Areas Remaining

- Stripe lifecycle and failure-mode evidence
- CodeQL And Dependency Security run evidence
- Supabase Backup/PITR Restore Drill
- GDPR/DSAR Lifecycle

## Recommendations

- Replace `Pending` values with dated filenames as evidence is added.
- Keep one short Markdown note beside each screenshot set to explain environment, tester, result, and any follow-up.
- Do not mark an area `🟩 Complete` unless all four completion rules above are satisfied.
