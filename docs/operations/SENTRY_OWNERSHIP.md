# Sentry Ownership

Last updated: 2026-06-16

Owner:
James Walsh

Coverage:
Production

Monitoring Responsibility:
Founder monitored

## Alert Categories

Critical:
Immediate review

High:
Same day review

Normal:
Next business day

## Required Production Rules

Before this area can be scored 9/10, capture live evidence for:

- error spike on production
- new issue on auth, billing, import, and GDPR routes
- regressed issue after deploy
- failed Stripe webhook or billing lifecycle processing signal
- auth-abuse or repeated-failure signal
- test alert delivery to the named owner or channel

## Notification Destinations

- Sentry project: `complyeur`
- Sentry organization: `james-walsh`
- Production Sentry runtime configuration: present in Vercel production environment
- Production Sentry build authentication configuration: present in Vercel production environment
- Production issue API access: verified on 2026-06-16 with a newly created read-capable personal token; unresolved production issue query returned `[]` for the last 24 hours
- Live alert-rule destinations and recipients: not verified on 2026-06-16

## Escalation Process

James Walsh reviews production Sentry alerts during the beta period.

- Critical alerts: review immediately, pause affected beta activity if customer data, authentication, billing, or core compliance calculations may be affected, and create an incident record if user impact is confirmed.
- High alerts: review the same day, triage the affected workflow, and schedule a fix or mitigation before further beta expansion if the issue affects core travel compliance workflows.
- Normal alerts: review by the next business day and batch into the beta defect triage workflow unless severity increases.

## Verification Status

Sentry ownership is assigned for beta. Production issue API read access was
verified on 2026-06-16, but live alert routing was not verified.

The beta blocker remains open until Sentry alert rules, notification
destinations, recipients, and test delivery are captured from the Sentry
dashboard or a read-capable Sentry API token.
