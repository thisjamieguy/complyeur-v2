# Sentry Ownership

Last updated: 2026-06-17

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
- Production Vercel `SENTRY_AUTH_TOKEN`: verified on 2026-06-17 as not valid for organization/project alert-rule APIs; read-only alert endpoints returned `401 Invalid org token`
- Dedicated personal-token alert inventory read: verified on 2026-06-17; initial inventory showed one active high-priority issue rule and one disabled uptime rule before the private-beta alert baseline was completed
- Live alert-rule destinations, recipients, and test delivery: verified on 2026-06-17 with 9 successful test notifications to the monitored mailbox

## Escalation Process

James Walsh reviews production Sentry alerts during the beta period.

- Critical alerts: review immediately, pause affected beta activity if customer data, authentication, billing, or core compliance calculations may be affected, and create an incident record if user impact is confirmed.
- High alerts: review the same day, triage the affected workflow, and schedule a fix or mitigation before further beta expansion if the issue affects core travel compliance workflows.
- Normal alerts: review by the next business day and batch into the beta defect triage workflow unless severity increases.

## Verification Status

Sentry ownership is assigned for beta. Production issue API read access was
verified on 2026-06-16 with a dedicated read-capable personal token. On
2026-06-17, a dedicated personal token also verified live rule inventory, while
the Vercel production `SENTRY_AUTH_TOKEN` remained insufficient for alert-rule
verification.

The private-beta issue-alert baseline is now verified complete. On 2026-06-17,
the operator created the required alert set, removed a duplicate high-priority
rule, and confirmed 9 successful test notifications to the monitored mailbox.
Failed Stripe webhook and stale billing-processing alerting remain tracked
under the separate Beta Monitoring Cron evidence item.
