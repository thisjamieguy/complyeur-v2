# ComplyEur Private Beta Tester Brief

Last updated: 2026-06-16

Use this brief when inviting or onboarding private beta testers.

## What We Need From Testers

- Use the core product with real-world but non-sensitive test scenarios.
- Report anything confusing, broken, or unexpectedly slow.
- Complete one full journey where possible: signup, employee setup, trip entry,
  compliance review, export, settings, and logout. If you want to test account
  deletion, use the documented request path rather than looking for a
  self-service delete button.

## Where To Send Feedback

- In-app: use the beta feedback button in the dashboard.
- Email: `support@complyeur.com`

When reporting a problem, include:
- what you were trying to do
- what happened instead
- the page you were on
- screenshot or screen recording if available

## Current Known Issues

See `docs/beta/BETA_KNOWN_ISSUES.md` for the current release-known issues list.
Send that document alongside this brief when inviting testers.

## What Is Still Being Verified

- Multi-provider email deliverability across Gmail, Outlook, and corporate providers
- Password reset delivery and reset-link behavior
- Real-device iPhone Safari and Android Chrome coverage
- Sentry alert routing evidence
- Non-founder onboarding evidence from a tester who has not seen the app

Repo-side verification helpers are tracked in
`docs/operations/BETA_VERIFICATION_AUTOMATION.md`.

## Support Expectations

- We review beta feedback during business hours.
- Critical login, data, or security issues are escalated immediately.
- Non-critical UX issues and feature requests are grouped into the weekly beta review.
