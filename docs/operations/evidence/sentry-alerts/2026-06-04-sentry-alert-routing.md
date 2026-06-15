# Sentry Alert Routing Evidence

Date:
2026-06-04

Verified By:
James Walsh

Environment:
Production

## Evidence Files

- `2026-06-04-sentry-project-settings-blocked.png`
- `2026-06-04-sentry-alert-rules-blocked.png`
- `2026-06-04-sentry-notification-routing-blocked.png`

## Result

FAIL

## Recipients

Not verified.

The production Sentry configuration exists, but live alert recipients could not
be read because the configured Sentry token returned `403 Forbidden` for the
read-only Sentry project API request.

## Coverage

- Vercel production environment includes `NEXT_PUBLIC_SENTRY_DSN`.
- Vercel production environment includes `SENTRY_ORG`.
- Vercel production environment includes `SENTRY_PROJECT`.
- Vercel production environment includes `SENTRY_AUTH_TOKEN`.
- Sentry organization from production env: `james-walsh`.
- Sentry project from production env: `complyeur`.
- Live Sentry project settings: not verified.
- Live Sentry environments: not verified.
- Live Sentry alert rules: not verified.
- Live Sentry notification routing: not verified.

## Notes

- The repository has Sentry runtime and build integration wired through
  `sentry.client.config.ts`, `sentry.server.config.ts`,
  `sentry.edge.config.ts`, and `next.config.ts`.
- Vercel production environment variable presence confirms Sentry is configured
  for production runtime/build use.
- This evidence does not prove alert ownership or notification routing is live.
- The beta blocker should remain open until screenshots from Sentry alert
  settings show a responsible recipient or channel.
- To complete verification, use either an authenticated Sentry dashboard session
  or a Sentry token with read-only scopes sufficient to read project settings,
  project environments, issue alert rules, metric alert rules, and rule actions.
