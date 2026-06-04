# Beta Support And Alerting Baseline

Last updated: 2026-06-04

This document defines the minimum support and alerting posture for ComplyEur's
private beta.

## Support Channel

- Primary support mailbox: `support@complyeur.com`
- Transactional email reply-to fallback in code: `support@complyeur.com`
- In-app feedback entry point: beta feedback dialog in dashboard/sidebar
- Internal triage surface: `/admin/feedback` for superadmins

## Ownership Model

Before inviting testers, assign one named human to each role:

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
- Regressed issue after deploy

Each alert must have:
- a named recipient or channel
- an owner who acknowledges it
- an evidence link or screenshot stored with release records

## Stripe And Webhook Monitoring

- Stripe webhook endpoint must be configured for the deployed beta URL.
- Failed webhook events must trigger a dashboard review or alert.
- Payment-related support email must route to the same monitored support path.

## Feedback Handling

- Share `docs/beta/BETA_TESTER_BRIEF.md` with each tester cohort.
- Log every actionable tester report in the tracker used for beta triage.
- Maintain one issue per distinct bug; avoid burying incidents in email threads.
- Record support ownership confirmation in `docs/operations/evidence/`.
