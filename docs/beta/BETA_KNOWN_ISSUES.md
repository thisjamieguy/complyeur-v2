# Beta Known Issues

Last updated: 2026-06-15

## Status

This is a tester-facing known-issues list. The release go/no-go decision remains
in `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`; evidence status remains in
`docs/operations/evidence/EVIDENCE_STATUS.md`.

## Product and Billing
- Stripe price IDs must be synced and audited against the Stripe dashboard before live billing.
- Checkout and subscription flows rely on Stripe webhooks; delays may briefly show a pending state.

## Email
- One production signup confirmation path has been verified, but broader
  deliverability is not fully evidenced across Gmail, Outlook, and corporate
  providers.
- Password reset delivery, single-use behavior, expiry, and post-reset session
  behavior still need beta-environment evidence.
- SPF, DKIM, and DMARC configuration is required before production launch.

## Analytics and Monitoring
- Product analytics coverage is in progress. Early metrics may be incomplete for the first beta cohort.
- Sentry ownership is assigned, but live alert rules, notification routing,
  recipients, and test delivery evidence are still pending.

## Devices and Browsers
- Real-device testing on iOS Safari and Android Chrome is pending.
- Ad-blockers may suppress analytics and consent scripts; core app should still function.

## Documentation and Operations
- Baseline branch protection on `main` is evidenced complete. Expanded CodeQL
  and dependency-security workflow run evidence is still pending.
- Recovery procedure is documented in `docs/RUNBOOK.md`, but full disaster-recovery testing is still pending.
- The DPA template is still a draft pending legal review and should not be sent to enterprise testers as final.
- The processor/subprocessor register needs a final legal review, including DPA/SCC status for analytics, consent, and anti-abuse providers.

## Manual / External Checks Still Open
- Verify Vercel production environment variables, custom domain, SSL, and production `/api/health`.
- Verify Supabase production backups, PITR, current plan, and a documented restore test.
- Attach fresh staging or production-like RLS attack-test evidence for cross-tenant isolation.
- Confirm Sentry alerts, uptime monitoring, webhook-failure alerts, and public/internal health evidence.
- Run real email deliverability checks across Gmail, Outlook, and at least one corporate provider.
- Complete password reset evidence: request, delivery, successful reset,
  expired/reused token behavior, and post-reset session behavior.
- Complete real-device checks on iOS Safari and Android Chrome.
- Complete a non-founder full journey: signup, email verification, add employee, add trip, view compliance, export, billing path, settings, logout, and, if requested, the documented deletion-request path.
- Distribute this known-issues list and `docs/beta/BETA_TESTER_BRIEF.md` before
  inviting testers.

## Tester Communications
- Pair this document with `docs/beta/BETA_TESTER_BRIEF.md` when inviting testers.
- Route tester feedback to the in-app beta feedback flow or `support@complyeur.com`.
- Use `docs/operations/BETA_VERIFICATION_AUTOMATION.md` for the repo-side checks that can be completed before tester outreach.
