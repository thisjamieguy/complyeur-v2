# Beta Known Issues

Last updated: June 3, 2026

## Product and Billing
- Stripe price IDs must be synced and audited against the Stripe dashboard before live billing.
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
- The DPA template is still a draft pending legal review and should not be sent to enterprise testers as final.
- The processor/subprocessor register needs a final legal review, including DPA/SCC status for analytics, consent, and anti-abuse providers.

## Manual / External Checks Still Open
- Verify Vercel production environment variables, custom domain, SSL, and production `/api/health`.
- Verify Supabase production backups, PITR, current plan, and a documented restore test.
- Attach fresh staging or production-like RLS attack-test evidence for cross-tenant isolation.
- Confirm Sentry alerts, uptime monitoring, webhook-failure alerts, and support inbox ownership.
- Run real email deliverability checks across Gmail, Outlook, and at least one corporate provider.
- Complete real-device checks on iOS Safari and Android Chrome.
- Complete a non-founder full journey: signup, email verification, add employee, add trip, view compliance, export, billing path, settings, logout, and deletion.
