# Beta Success Metrics

Last updated: 2026-06-15

## Status

Supporting release document. These targets are still the active private-beta
success metrics, but metric ownership and tracking source are not fully assigned.
The release source of truth is
`docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`.

## Activation
Definition: A new company completes onboarding and adds at least 1 employee and 1 trip within 24 hours of signup.
Target: 40 percent or higher.
Owner: Product owner.
Current tracking state: dashboard source is `/admin/metrics`; zero-signup
monitoring runs from `/api/cron/beta-monitoring`. Weekly reporting owner and
review cadence still need operational confirmation.

## Core Usage
Definition: Weekly active companies that create or edit at least 1 trip.
Target: 50 percent or higher of activated companies.
Owner: Product owner.
Current tracking state: `/admin/metrics` reports new trips over 7 or 30 days;
weekly review cadence pending.

## Retention
Definition: Companies active at least once between days 14 and 21 after signup.
Target: 30 percent or higher.
Owner: Product owner.
Current tracking state: tracking source pending.

## Conversion
Definition: Trial or beta users that move to a paid tier or confirm intent to pay when prices are finalized.
Target: 10 percent or higher.
Owner: Billing owner.
Current tracking state: pricing model exists; live billing readiness remains
blocked until Stripe price IDs, webhook endpoint, and lifecycle evidence are
complete.

## Qualitative Feedback
Definition: Number of actionable feedback items logged per active company during beta.
Target: 1 or more per active company.
Owner: Support owner.
Current tracking state: support ownership is evidenced; feedback triage cadence
should be confirmed before tester invites.
