# Beta Pricing Model (Section 4)

## Objectives
- Keep onboarding friction low for beta users.
- Align monetization with team value growth.
- Preserve a clean upgrade path from Basic -> Pro -> Pro+.

## Recommended Beta Model

### Value Metric
- Primary metric: `tracked employees`
- Secondary guardrail: `team seats` (`max_users`)

### Tiers

| Internal slug | Public name | Monthly (GBP) | Annual (GBP) | Annual discount | Employee cap | Seat cap |
|---|---|---:|---:|---:|---:|---:|
| `free` | Basic | 49 | 490 | ~17% | 10 | 2 |
| `starter` | Pro | 149 | 1490 | ~17% | 50 | 5 |
| `professional` | Pro+ | 349 | 3490 | ~17% | 200 | 15 |
| `enterprise` | Enterprise (Legacy) | custom | custom | n/a | custom | custom |

## Feature Packaging
- Basic: CSV export only, no advanced forecasting/calendar/API/SSO/audit.
- Pro: forecast + calendar + PDF export unlocked.
- Pro+: bulk import + higher usage caps + full self-serve capability.
- Enterprise (legacy/custom): negotiated packaging.

## Stripe Product/Price Naming
- Product names:
  - `ComplyEur Basic`
  - `ComplyEur Pro`
  - `ComplyEur Pro+`
- Price names:
  - `Basic Monthly GBP`, `Basic Annual GBP`
  - `Pro Monthly GBP`, `Pro Annual GBP`
  - `Pro+ Monthly GBP`, `Pro+ Annual GBP`

## Conversion Guardrails (Beta)
- Basic -> Pro prompt at >= 80% employee cap utilization.
- Pro -> Pro+ prompt at >= 80% employee or seat cap utilization.
- Portal CTA always available from settings billing panel.

## Success Criteria
- Checkout success rate >= 95%.
- Webhook processing failure rate < 1%.
- Upgrade conversion from capped accounts >= 10% during beta.

## Notes
- This model matches current code defaults in:
  - `lib/billing/plans.ts`
- Real Stripe price IDs still must be synced into `public.tiers`.
