# Support Ownership Evidence

Date: 2026-06-04

Verified By: James Walsh

Environment: Production

Support Owner: James Walsh

Support Address: `support@complyeur.com`

## Evidence Files

- `2026-06-04-support-mailbox.png`
- `2026-06-04-support-routing.png`
- `2026-06-04-support-address-configuration.png`

## Result

PASS

## Response Targets

Critical: 4 hours

High: 1 business day

Normal: 2 business days

## Verification Summary

- Support ownership is documented in `docs/operations/SUPPORT_OWNERSHIP.md`.
- The primary beta support owner is James Walsh.
- The primary beta support channel is `support@complyeur.com`.
- Public DNS for `complyeur.com` returns IONOS MX records:
  - `mx00.ionos.co.uk`
  - `mx01.ionos.co.uk`
- Public DNS for `complyeur.com` returns SPF configuration including Resend:
  - `v=spf1 include:resend.com ~all`
- Repository email services use `support@complyeur.com` as the default
  `EMAIL_REPLY_TO` fallback.
- Routing and escalation are documented as founder-monitored support for beta.

## Notes

- No forwarding rule is required for the beta period because James Walsh
  monitors the support mailbox directly.
- No provider-console forwarding screenshot was available in this environment.
  The routing evidence records the direct-monitoring operational decision
  instead.
- A non-delivering SMTP recipient probe was attempted from this environment, but
  outbound port 25 connectivity to `mx00.ionos.co.uk` was refused. This evidence
  therefore relies on DNS, repository support address configuration, and the
  documented founder-monitoring process.
