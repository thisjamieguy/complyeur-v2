# Sentry Org Token API Check

Date:
2026-06-17

Verified By:
Codex

Environment:
Production configuration pulled from Vercel into local `/tmp` for read-only API checks

## Evidence Files

- `2026-06-17-sentry-org-token-api-output.json`

## Commands

The operator pulled production environment variables from Vercel without
printing secret values:

```bash
vercel env pull /tmp/complyeur.vercel.production.env --environment=production --yes
```

The operator then sourced that file locally and issued read-only Sentry API
requests against project and organization alert endpoints. Token values were not
printed or stored in the evidence note.

## Result

FAIL

All tested alert-rule and project-read endpoints returned `401` with
`{"detail":"Invalid org token"}` when called with the Vercel production
`SENTRY_AUTH_TOKEN`.

## What This Proves

- Vercel production still contains `SENTRY_ORG`, `SENTRY_PROJECT`, and
  `SENTRY_AUTH_TOKEN`.
- The production `SENTRY_AUTH_TOKEN` is not a valid organization-scoped token
  for read-only alert-rule or project metadata APIs.
- The current production token cannot be used to complete alert-rule,
  notification-routing, recipient, or test-delivery evidence from the API.

## What This Does Not Prove

- Whether Sentry alert rules are configured in the dashboard.
- Whether notification destinations or recipients are correct.
- Whether a test alert reaches the named monitoring owner.
- Whether a separate read-capable personal token or dashboard session could
  successfully verify those controls.

## Follow-Up

To close the Sentry beta blocker, use one of these paths:

1. Run the documented alert-rule checks with a dedicated read-only personal
   token that has `org:read`, `project:read`, and alert-rule visibility.
2. Capture authenticated Sentry dashboard screenshots for:
   - alert rule configuration
   - notification routing
   - named recipient or channel
   - delivered test alert to the monitoring owner

Do not rely on the Vercel production `SENTRY_AUTH_TOKEN` for this evidence path
unless it is intentionally replaced with an organization-capable read token.
