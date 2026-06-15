# Beta Support And Alerting Baseline

Last updated: 2026-06-15

This document defines the minimum support and alerting posture for ComplyEur's
private beta.

## Support Channel

- Primary support mailbox: `support@complyeur.com`
- Transactional email reply-to fallback in code: `support@complyeur.com`
- In-app feedback entry point: beta feedback dialog in dashboard/sidebar
- Internal triage surface: `/admin/feedback` for superadmins

## Ownership Model

Current private-beta assignment:

- Beta support owner: James Walsh.
- Beta feedback owner: James Walsh.
- Engineering escalation owner: James Walsh.

This satisfies the support ownership blocker for founder-monitored private beta.
Evidence is stored in
`docs/operations/evidence/support-ownership/2026-06-04-support-ownership.md`.

Before expanding beta coverage beyond founder-monitored support, assign one
named human to each role:

- Beta support owner: checks the support inbox at least twice per business day.
- Beta feedback owner: reviews `/admin/feedback` and categorizes incoming items.
- Engineering escalation owner: takes bugs and security issues from support to action.

If one person holds multiple roles, record that explicitly in the release
notes. Unowned inboxes do not meet beta standard.

## Triage Cadence

- Business-day review minimum: morning and afternoon inbox checks
- Launch-day review minimum: every 2 hours during the first 12 hours
- Severity escalation:
  - Sev1: data exposure, corruption, or login outage -> immediate engineering escalation
  - Sev2: broken core workflow, exports failing, billing failures -> same-day response
  - Sev3: UX friction, low-impact bugs, feature requests -> batch into weekly beta review

## Minimum Sentry Alert Rules

Configure and verify these rules in Sentry before beta:

- Error spike on production environment
- New issue for auth or billing routes
- New issue for import, GDPR, and tenant-isolation-sensitive routes
- Regressed issue after deploy
- Repeated auth failure or abuse signal

Each alert must have:
- a named recipient or channel
- an owner who acknowledges it
- an evidence link or screenshot stored with release records

## Stripe And Webhook Monitoring

- Stripe webhook endpoint must be configured for the deployed beta URL.
- Failed webhook events must trigger a dashboard review or alert.
- Payment-related support email must route to the same monitored support path.
- Webhook replay, stale-processing, out-of-order event, failed-payment,
  cancellation, and reconciliation evidence must be stored before paid/public
  beta.

## Release Gate Evidence

Every production release must record:

- branch and commit SHA
- CI result, including CodeQL and dependency/security audit jobs
- Vercel deployment ID and URL
- public `/api/health` result
- internal health result where the operator has `CRON_SECRET`
- approver
- rollback note or last-known-good deployment ID
- evidence folder or document link

## Feedback Handling

- Share `docs/beta/BETA_TESTER_BRIEF.md` with each tester cohort.
- Log every actionable tester report in the tracker used for beta triage.
- Maintain one issue per distinct bug; avoid burying incidents in email threads.
- Record support ownership confirmation in `docs/operations/evidence/`.
