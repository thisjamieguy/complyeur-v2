# Beta Known Issues

Last updated: February 17, 2026

## Product and Billing
- Stripe price IDs in `tiers` are placeholders and must be replaced before live billing.
- Checkout and subscription flows rely on Stripe webhooks; delays may briefly show a pending state.

## Email
- Auth and alert email deliverability is not fully verified across Gmail, Outlook, and corporate providers.
- SPF, DKIM, and DMARC configuration is required before production launch.

## Analytics and Monitoring
- Product analytics coverage is in progress. Early metrics may be incomplete for the first beta cohort.

## Devices and Browsers
- Real-device testing on iOS Safari and Android Chrome is pending.
- Ad-blockers may suppress analytics and consent scripts; core app should still function.

## Documentation and Operations
- Branch protection must be enabled on `main` using `docs/BRANCH_PROTECTION_BASELINE.md`.
- Runbooks exist, but full disaster-recovery testing is pending.
