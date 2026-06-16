# Private Beta Manual Verification Checklist

## Status

**Supporting release document.**

- Current beta go/no-go decisions are made in
  `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`.
- Current completion status is tracked in
  `docs/operations/evidence/EVIDENCE_STATUS.md`.
- Use this checklist to execute the remaining manual beta verification gate on
  the deployed environment.

Last updated: 2026-06-15

Use this checklist on the deployed beta environment. This is the manual
verification gate that remains after automated tests are green.

Checkboxes in this file are intentionally reset for each verification run. Do
not use them as the persistent release status.

Run the repo-side prep helpers in `docs/operations/BETA_VERIFICATION_AUTOMATION.md`
before starting this checklist.

## 1. Auth And Email

- [ ] Signup works for a new tester account.
- [ ] Confirmation email reaches a Gmail inbox.
- [ ] Confirmation email reaches an Outlook inbox.
- [ ] Confirmation email reaches one corporate inbox.
- [ ] Confirmation link lands on the expected post-auth screen.
- [ ] Password reset email reaches inbox and is not obviously broken.
- [ ] Password reset link can be used once and cannot be reused.
- [ ] Existing session behavior after password reset is confirmed and recorded.
- [ ] Transactional emails show the expected reply-to/support path.

## 2. Core Product Journey

- [ ] A non-founder tester can complete signup without coaching.
- [ ] Tester can add at least one employee.
- [ ] Tester can add at least one trip.
- [ ] Compliance results render and appear plausible.
- [ ] Alerts or warning states display when expected.
- [ ] CSV export works.
- [ ] PDF export works.
- [ ] Settings page loads and saves expected preferences.
- [ ] Logout completes and protected routes no longer load.
- [ ] If deletion is requested, the manual support/admin deletion path is understood and matches `docs/DATA_DELETION_WORKFLOW.md`.

## 3. Device, Accessibility, And Browser Checks

- [ ] Real-device iPhone Safari pass completed.
- [ ] Real-device Android Chrome pass completed.
- [ ] Screen reader pass completed with VoiceOver or NVDA on one core workflow.
- [ ] Ad blocker check completed for auth, dashboard, Stripe, CookieYes, and analytics.
- [ ] Lighthouse audit recorded for the beta URL.
- [ ] Dark-mode email rendering checked in at least one mail client.

## 4. Release Dashboards And Alerts

- [ ] GitHub branch protection on `main` matches `docs/BRANCH_PROTECTION_BASELINE.md`.
- [x] Vercel production env vars, custom domain, SSL, public `/api/health`, and
  protected `/api/internal/health` are verified in
  `docs/operations/evidence/platform-dashboard/2026-06-16-vercel-supabase-sentry-dashboard-evidence.md`.
- [x] Supabase backup/PITR absence is explicitly risk-accepted only for the
  initial private tester group; current CLI evidence reports
  `pitr_enabled: false` and no listed physical backups.
- [ ] Sentry error-spike alert exists and routes to the current owner.
- [ ] Webhook-failure monitoring is configured for Stripe.
- [ ] Support inbox owner and response cadence are confirmed.

## Evidence To Capture

- Date of run
- Environment URL
- Tester name
- Inbox/provider tested
- Screenshots or links for failures
- Follow-up issue links for any failed item

Store the completed evidence log under `docs/operations/evidence/`.
