# Sentry Production Issues API Check

Date:
2026-06-16

Verified By:
James Walsh

Environment:
Production

## Evidence Files

- `2026-06-16-sentry-production-issues-api-output.json`

## Command

The operator ran the Sentry API helper locally with a newly created read-capable
Sentry personal token. The token value was not printed or stored.

```bash
python3 /Users/jameswalsh/.codex/skills/sentry/scripts/sentry_api.py \
  --org james-walsh \
  --project complyeur \
  list-issues \
  --environment production \
  --time-range 24h \
  --limit 20 \
  --query "is:unresolved"
```

## Result

PARTIAL PASS

The command returned an empty JSON array:

```json
[]
```

## What This Proves

- Sentry API read access for organization `james-walsh` and project `complyeur`
  worked with the newly created token.
- The production issue query succeeded for the last 24 hours.
- No unresolved production issues matched `is:unresolved` in that query window.

## What This Does Not Prove

- Sentry alert rules are configured.
- Notification destinations or recipients are correct.
- A test alert reaches the monitoring owner.
- Required auth, billing, import, GDPR, regressed-issue, error-spike, or
  webhook-failure alert coverage exists.

## Follow-Up

Keep the Sentry alert-routing blocker open until dashboard screenshots or API
evidence prove alert rules, notification routing, recipients, and test alert
delivery to the named owner.
