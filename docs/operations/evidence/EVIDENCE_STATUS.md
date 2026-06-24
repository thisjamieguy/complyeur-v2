# Beta Evidence Status Dashboard

Last updated: 2026-06-24

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
| Password Reset | ⬜ Not Started | Pending | Pending | `docs/operations/evidence/password-reset/` |
| Recovery Drill | 🟨 In Progress | Backup/PITR precheck captured; data-bearing preview restore attempted but failed before validation | `2026-06-24-supabase-backup-pitr-precheck.md` | `docs/operations/evidence/recovery-drills/` |
| Non-Founder Onboarding | ⬜ Not Started | Founder simulation screenshots captured; non-founder evidence pending | `2026-06-05-founder-simulation-onboarding.md` founder simulation only | `docs/operations/evidence/beta-onboarding/` |
| Sentry Alert Routing | 🚫 Blocked | `2026-06-04-sentry-project-settings-blocked.png`, `2026-06-04-sentry-alert-rules-blocked.png`, `2026-06-04-sentry-notification-routing-blocked.png` | `2026-06-04-sentry-alert-routing.md` | `docs/operations/evidence/sentry-alerts/` |
| Support Ownership | 🟩 Complete | `2026-06-04-support-mailbox.png`, `2026-06-04-support-routing.png`, `2026-06-04-support-address-configuration.png` | `2026-06-04-support-ownership.md` | `docs/operations/evidence/support-ownership/` |
| Stripe Verification | 🟨 In Progress | API evidence captured; dashboard screenshots still optional/pending | `2026-06-23-live-stripe-payment-evidence.md` | `docs/operations/evidence/stripe-verification/` |
| Local Multi-User E2E | 🟩 Complete | Command output recorded in note | `2026-06-24-local-multi-user-e2e.md` | `docs/operations/evidence/multi-user-e2e/` |
| Production RLS/RPC Attack Probe | 🟩 Complete | Command output recorded in note | `2026-06-24-production-rls-rpc-attack-probe.md` | `docs/operations/evidence/multi-user-e2e/` |
| CodeQL And Dependency Security | 🟨 In Progress | Pending GitHub run evidence | `.github/workflows/codeql.yml`, `.github/workflows/security.yml`, and `.github/dependabot.yml` added locally; dashboard evidence pending | `docs/operations/evidence/branch-protection/` |
| Public/Internal Health | 🟨 In Progress | Pending current production probe | Public health is now anon `ping()` only; internal deep health is CRON-protected | `docs/operations/evidence/` |
| Supabase Backup/PITR Restore Drill | 🚫 Blocked | Production daily physical backups verified; PITR disabled; automated data-bearing preview restore ended `RESTORE_FAILED` and was deleted | `2026-06-24-supabase-backup-pitr-precheck.md` | `docs/operations/evidence/recovery-drills/` |
| GDPR/DSAR Lifecycle | 🟨 In Progress | Pending reviewer sign-off | Import raw PII retention was broadened in code; full DSAR and backup limitation evidence pending | `docs/operations/evidence/` |

## Status Legend

⬜ Not Started

🟨 In Progress

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
- 2026-06-24 precheck verified production daily physical backups, production
  row-count/RLS baseline, and current Supabase project/plan metadata. Full
  restore-drill sign-off remains blocked because PITR is disabled and the
  attempted data-bearing preview branch restore ended `RESTORE_FAILED`.

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
- Sentry ownership is documented in `docs/operations/SENTRY_OWNERSHIP.md`, but routing evidence is incomplete.
- Sentry Alert Routing remains a beta blocker until live Sentry screenshots or read-capable API evidence show alerts routed to a responsible recipient.

### Stripe Verification

- 2026-06-23 live Stripe API evidence confirms the account has charges and payouts enabled.
- A live `GBP 1.00` discounted subscription checkout completed successfully in live mode.
- Production Stripe price audit passed for all six configured price IDs, including amount, currency, interval, and active-status checks against the local plan catalog.
- The live webhook endpoint for `https://complyeur.com/api/billing/webhook` is enabled and matches the repo-required event set, including refund and dispute events.
- Production Supabase evidence confirms the checkout webhook was processed and provisioned the expected `professional` active entitlement.
- Production reconciliation on 2026-06-23 refreshed two active Stripe subscriptions and filled the tested checkout entitlement `current_period_end`.
- Code changes now retrieve `current_period_end` during checkout provisioning, source renewal-email amounts from Stripe invoice previews, alert billing/support on refunds and disputes, refresh entitlements when tier capabilities change, and provide a repeatable reconciliation script.
- Stripe Verification remains in progress until the updated handler is deployed and replay, stale/out-of-order event, failed-payment, cancellation, failed-webhook monitoring, and post-deploy lifecycle evidence are closed.

### Local Multi-User E2E

- 2026-06-24 local Supabase was running at `http://127.0.0.1:54321`.
- `pnpm test:e2e:multi-user` completed with `2 passed (1.1m)`.
- Evidence note stored as `docs/operations/evidence/multi-user-e2e/2026-06-24-local-multi-user-e2e.md`.
- This closes local tenant-isolation E2E evidence only. Staging or production-like RLS/RPC attack evidence remains required before paid/public release.

### Production RLS/RPC Attack Probe

- 2026-06-24 production Supabase project `bewydxxynjtfpytunlcq.supabase.co` was tested with disposable `codex-rls-*` users and companies.
- `scripts/security/production-rls-attack-probe.ts` passed 13 cross-tenant RLS and direct-RPC misuse checks.
- The probe confirmed cross-tenant employee/trip reads returned zero rows, cross-tenant writes were blocked, viewer invite access was blocked, and direct RPC misuse for seat usage, user limit, and ownership transfer was denied.
- Main run cleanup reported no errors, and cleanup-only verification for run id `mqsfpgw4-9od9t7` found no remaining disposable users or companies.
- Evidence note stored as `docs/operations/evidence/multi-user-e2e/2026-06-24-production-rls-rpc-attack-probe.md`.

## Release Progress Summary

### Critical Evidence Areas Complete

5 complete:

- Branch Protection
- Signup Email Verification
- Local Multi-User E2E
- Production RLS/RPC Attack Probe
- Support Ownership

### Private Beta Evidence Blockers Remaining

6 remaining:

- Multi-Provider Email Deliverability
- Password Reset
- Recovery Drill
- Non-Founder Onboarding
- Sentry Alert Routing
- Public/Internal Health

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
