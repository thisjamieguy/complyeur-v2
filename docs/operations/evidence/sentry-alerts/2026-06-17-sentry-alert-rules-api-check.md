# Sentry Alert Rules API Check

Date:
2026-06-17

Verified By:
Codex using operator-created personal Sentry token sourced locally

Environment:
Production

## Evidence Files

- `2026-06-17-sentry-alert-rules-api-output.json`

## Commands

The operator created a personal Sentry token locally and sourced it from:

```bash
source ~/.config/sentry/complyeur
```

The token value was not printed. Read-only API checks were then executed against
the project rule and organization combined-rules endpoints.

## Result

PARTIAL PASS

Sentry alert configuration is now readable through the API with the operator's
personal token. The current production alert inventory does not satisfy the
documented private-beta baseline.

## What This Proves

- Read access to production Sentry alert configuration works with a dedicated
  operator token.
- Project `complyeur` currently exposes one active issue rule:
  `Send a notification for high priority issues`.
- That rule notifies `IssueOwners` and falls back to `ActiveMembers`.
- The only other returned combined rule is a disabled uptime monitor for
  `https://complyeur-gold-rc.onrender.com`.
- No organization monitors were returned from `/api/0/organizations/james-walsh/monitors/`.
- No additional entries were returned from `/api/0/organizations/james-walsh/alert-rules/`.

## What This Does Not Prove

- A delivered test alert to the named monitoring owner.
- Coverage for the required beta alert set:
  - production error spike
  - new auth or billing issue
  - new import, GDPR, or tenant-sensitive issue
  - regressed issue after deploy
  - repeated auth-failure or abuse signal
- That issue ownership rules are configured such that `IssueOwners` resolves to a
  responsible recipient for the relevant production flows.

## Conclusion

The Sentry blocker is no longer an access problem. It remains open because the
live production rule inventory currently shows only one active high-priority
issue notification rule and no evidenced test delivery.

## Follow-Up

Before this item can be marked complete:

1. Add or verify the required production issue-alert rules in Sentry.
2. Confirm the notification target resolves to a named owner or explicit
   recipient path.
3. Trigger and capture a test alert delivery to that owner or channel.
