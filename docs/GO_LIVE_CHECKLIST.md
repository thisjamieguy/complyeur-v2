# ComplyEur Master Production Readiness Checklist

This is the master checklist for ComplyEur production readiness.

Use it as the default standard for every major release. Do not announce a launch, onboard paying customers, or call the app production-ready until every required item in this file is complete or explicitly accepted as a documented risk.

---

## How To Use This Checklist

- [ ] Treat this file as the single release gate for production readiness.
- [ ] Do not mark an item complete unless you saw the evidence yourself.
- [ ] If a check fails, stop, fix it, and rerun it before moving on.
- [ ] For manual tests, record the date, tester, and result next to the item or in your release notes.
- [ ] If you skip anything, write down the reason and who accepted the risk.
- [ ] Keep screenshots, command output, or dashboard links for anything that cannot be proven from code.
- [ ] Re-run the relevant section after every meaningful code, database, billing, or environment change.
- [ ] Use `docs/operations/PHASE_EXECUTION_PROMPT_AND_RESULTS.md` when asking Codex to run a phase and record the result.

## Release Decision Rules

- `NO-GO`: any failing automated test, failing build, unverified billing, broken auth, broken data isolation, or missing rollback path.
- `SOFT GO`: suitable for private beta only; some non-critical items may remain open, but core flows, security, and support response must be ready.
- `FULL GO`: suitable for public production launch; all required sections below are complete.

## Release Record

- Release name:
- Target date:
- Branch / commit:
- Environment:
- Release owner:
- Tester:
- Decision: `NO-GO` / `SOFT GO` / `FULL GO`
- Evidence folder / notes:

## Evidence Pack

- [ ] CI run link saved.
- [ ] Vercel deployment link saved.
- [ ] Supabase migration status evidence saved.
- [ ] Stripe price and webhook evidence saved.
- [ ] Resend DNS / deliverability evidence saved.
- [ ] Sentry / uptime monitor evidence saved.
- [ ] Manual QA notes saved.
- [ ] Accepted risks documented with owner and follow-up date.

---

## Phase 1: Code And Build Health

- [ ] Working tree is understood before release. No accidental local-only changes or mystery deletions.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes with zero errors. Any warnings are reviewed and accepted in writing.
- [ ] `npm run test:unit` passes.
- [ ] `npm run test:integration` passes.
- [ ] `npm run build` passes on the release branch.
- [ ] `npm run test:e2e:baseline` passes with the required test credentials.
- [ ] `npm run test:e2e:multi-user` passes before any public launch.
- [ ] `npm run test:e2e:a11y` passes or any findings are triaged.
- [ ] `npm run test:e2e:mobile` passes or any findings are triaged.
- [ ] CI on GitHub is green for the release commit.
- [ ] Node version used locally matches or is compatible with CI and production.
- [ ] Unused code / dependency check passes if run (`npm run knip`).
- [ ] Shell scripts pass static checks if changed (`npm run shellcheck`).
- [ ] No `.only`, skipped critical tests, or temporary test bypasses are present in release test files.
- [ ] Test output is reviewed for skipped tests and the reason for every important skip is understood.

### Source Control Gates

- [ ] Release branch is based on the expected `main`.
- [ ] Branch protection is enabled for `main`.
- [ ] Required CI checks must pass before merge.
- [ ] At least one review is complete for production-impacting changes.
- [ ] Release commit is pushed and visible on GitHub.

### Evidence

- Build URL:
- CI run URL:
- Local verification date:
- E2E report URL or artifact:

---

## Phase 2: Environment And Secrets

- [ ] Production environment variables are set in Vercel Production only where appropriate.
- [ ] Preview and production Supabase credentials are fully separated.
- [ ] No production secret is configured for all environments unless it is intentionally shared.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to the correct production project.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is configured and only used server-side.
- [ ] `DATABASE_URL` uses the intended production connection path.
- [ ] `STRIPE_SECRET_KEY` is configured.
- [ ] `STRIPE_WEBHOOK_SECRET` is configured.
- [ ] `RESEND_API_KEY` is configured.
- [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured.
- [ ] `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are configured.
- [ ] `CRON_SECRET` is configured.
- [ ] Waitlist encryption secrets are configured if the waitlist is live.
- [ ] Google OAuth / social auth production redirect URLs are configured if enabled.
- [ ] Supabase Auth site URL and redirect URLs point to production domains.
- [ ] CookieYes / analytics IDs are production IDs, not test IDs.
- [ ] No secrets appear in browser HTML, client JS bundles, or network responses.
- [ ] `.env*` files remain gitignored and are not committed.
- [ ] Any previously exposed secret has been rotated before launch.

### Manual Checks

- [ ] Inspect browser network responses on a public page and confirm no secret values are exposed.
- [ ] Inspect built client code only if needed and confirm no service-role or webhook secrets appear.
- [ ] Open Vercel Production env var list and compare it against `.env.example`.

---

## Phase 3: Database And Data Safety

- [ ] Production Supabase project is the intended target.
- [ ] All required migrations are applied.
- [ ] Migration order is reviewed before applying to production.
- [ ] Migrations have been tested on local or preview Supabase first.
- [ ] Migration rollback or forward-fix plan is written for risky schema changes.
- [ ] RLS is enabled on every tenant-sensitive table.
- [ ] Multi-tenant isolation has been tested recently.
- [ ] Composite foreign keys and tenant integrity protections are in place where expected.
- [ ] Backups are enabled.
- [ ] PITR is enabled if available on the plan.
- [ ] Restore procedure is documented.
- [ ] At least one backup restore test has been performed and recorded.
- [ ] No fake, seeded, or test customer data remains in production.
- [ ] Data retention jobs and GDPR audit storage are configured as intended.
- [ ] Storage buckets used for exports or GDPR files are private unless intentionally public.
- [ ] Production database owner/admin access is limited to people who need it.

### Manual Checks

- [ ] Open Supabase dashboard and verify green RLS shields on production tables.
- [ ] Confirm recent backup / restore evidence exists.
- [ ] Run or verify a tenant-isolation test using two different accounts.
- [ ] Confirm production row counts are plausible before launch.

---

## Phase 4: Security And Abuse Resistance

- [ ] Security headers are present in production: CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] Public cron routes are protected by `CRON_SECRET`.
- [ ] Rate limiting is configured and production-safe.
- [ ] If Upstash is unavailable, production behavior is fail-closed where intended.
- [ ] No known critical or high vulnerabilities remain untriaged.
- [ ] Dependency audit has been run recently and results reviewed.
- [ ] Superadmin routes are gated correctly.
- [ ] MFA rules for privileged users have been verified.
- [ ] Test/debug routes are not publicly exposed in production unless intentionally protected.
- [ ] Sensitive query parameter stripping works on auth pages.
- [ ] Request body size limits are enforced.
- [ ] Service role operations are restricted to approved server-side paths only.
- [ ] Authenticated users cannot access another company's employees, trips, imports, exports, settings, or jobs by changing URLs.
- [ ] Viewer / non-admin users cannot perform owner/admin mutations.
- [ ] Webhook routes reject unsigned or malformed requests.
- [ ] Security audit findings from the latest audit are closed or explicitly accepted.
- [ ] GitHub secret scanning and Dependabot alerts are reviewed if enabled.

### Manual Checks

- [ ] Try to access admin routes with a non-admin account and confirm access is denied safely.
- [ ] Try protected routes while logged out and confirm redirect behavior is correct.
- [ ] Trigger a rate limit on a non-production environment and confirm the response is handled cleanly.
- [ ] Attempt a cross-company URL access check with two accounts and confirm no data leaks.

---

## Phase 5: Billing And Commercial Readiness

- [ ] Stripe price IDs are real production values, not placeholders.
- [ ] Stripe products and prices match the pricing page.
- [ ] Checkout route creates the correct session for each plan.
- [ ] Billing portal route works for an active subscriber.
- [ ] Stripe webhook endpoint exists and is configured with the required event set.
- [ ] Webhook signature verification is working.
- [ ] Subscription state updates correctly after checkout, renewal, failure, and cancellation.
- [ ] Trial behavior is correct if trials are offered.
- [ ] Failed payment emails or alerts are verified if enabled.
- [ ] Refund / cancel / downgrade support process is documented.
- [ ] Stripe account is in the intended mode for the release: test for beta drills, live for public production.
- [ ] Tax, invoice, and receipt settings are reviewed for the launch market.
- [ ] Pricing page copy matches actual billing behavior.
- [ ] Entitlement limits match product promises for every plan.
- [ ] Billing support escalation path is documented.

### Manual Billing Tests

- [ ] Buy the lowest paid plan with a test or real controlled account.
- [ ] Confirm the company entitlement changes after successful checkout.
- [ ] Trigger a renewal or simulated webhook and confirm status remains accurate.
- [ ] Trigger a failed payment scenario and confirm the app handles it safely.
- [ ] Open the billing portal and confirm plan management works.
- [ ] Cancel a subscription and confirm access changes as expected.

---

## Phase 6: Email, Domain, And Deliverability

- [ ] `complyeur.com` resolves correctly.
- [ ] `www.complyeur.com` resolves or redirects as intended.
- [ ] HTTPS is valid on apex and `www`.
- [ ] Resend domain is verified.
- [ ] SPF record is configured.
- [ ] DKIM record is configured.
- [ ] DMARC record is configured.
- [ ] Auth emails arrive successfully.
- [ ] Alert / notification emails arrive successfully.
- [ ] Email sender and reply-to addresses are correct.
- [ ] Email templates are branded, readable, and link to the correct production domain.
- [ ] Emails are not landing in spam for basic tests.
- [ ] Support mailbox exists and is monitored.
- [ ] Bounce / complaint monitoring is reviewed if available.

### Manual Email Tests

- [ ] Signup confirmation email received in Gmail.
- [ ] Signup confirmation email received in Outlook.
- [ ] Signup confirmation email received by at least one corporate email provider if practical.
- [ ] Password reset email received and reset link works.
- [ ] Invitation email received and invitation flow works.
- [ ] Export / GDPR / notification emails tested if those features are live.

---

## Phase 7: Legal, Privacy, And Compliance

- [ ] Privacy policy is live and accurate.
- [ ] Terms of service are live and accurate.
- [ ] Cookie policy is live and accurate.
- [ ] Accessibility statement is live.
- [ ] Cookie consent banner appears and behaves correctly.
- [ ] Analytics only load after the required consent decision.
- [ ] GDPR export works.
- [ ] Account deletion / erasure path works.
- [ ] Data deletion workflow is documented for operator use.
- [ ] DPA and customer-facing compliance materials are ready if needed for sales.
- [ ] Data classification document is current.
- [ ] Retention periods are documented and match implementation.
- [ ] Subprocessor list is ready if customers ask for it.
- [ ] Accessibility statement reflects current app status.

### Manual Compliance Tests

- [ ] Create a DSAR / export request and confirm the export is generated correctly.
- [ ] Run account deletion on a test account and confirm the expected soft-delete or deletion behavior.
- [ ] Reject analytics/cookies and confirm non-essential tracking does not load.
- [ ] Accept analytics/cookies and confirm analytics loads only after consent.

---

## Phase 8: Core Product Manual Test Pass

- [ ] Signup works for a new company.
- [ ] Email verification works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Password reset works.
- [ ] Onboarding flow works end to end.
- [ ] Dashboard loads with expected empty states and real data states.
- [ ] Employee create, edit, and delete work.
- [ ] Trip create, edit, and delete work.
- [ ] Import flow works for supported file formats.
- [ ] Compliance calculation is correct on known sample cases.
- [ ] Alerts and warnings appear at the right thresholds.
- [ ] Calendar / forecast views work if enabled by plan.
- [ ] CSV export works.
- [ ] PDF export works.
- [ ] Settings save correctly.
- [ ] Team invites and team permissions work.
- [ ] Admin-only features work for admins and stay blocked for non-admins.
- [ ] Empty company with no employees behaves cleanly.
- [ ] Company with many employees and trips remains usable.
- [ ] Invalid import files fail with clear, safe errors.
- [ ] Overlapping trips and edge dates are handled correctly.
- [ ] Nationality / visa status behavior matches the product rules.

### Recommended Manual Test Accounts

- [ ] Standard user
- [ ] Admin / owner
- [ ] Superadmin
- [ ] Second company user for tenant isolation checks
- [ ] Paid subscriber

### Compliance Calculation Smoke Cases

- [ ] Employee with 0 Schengen days shows 90 days remaining.
- [ ] Employee with 89 days shows 1 day remaining and not a breach.
- [ ] Employee with 90 days is treated as at limit / breach according to current product rules.
- [ ] Employee with overlapping trips does not double-count days.
- [ ] Trip crossing a year boundary counts correctly.
- [ ] Future trip forecast updates the risk state correctly.

---

## Phase 9: Browser, Device, Accessibility, And UX

- [ ] Latest Chrome tested.
- [ ] Safari tested.
- [ ] Firefox tested if practical.
- [ ] Mobile viewport tested.
- [ ] Tablet viewport tested if practical.
- [ ] No obvious layout breakage on key pages.
- [ ] Forms are usable with keyboard only on core flows.
- [ ] Visible focus states exist on interactive controls.
- [ ] No blocking console errors on core routes.
- [ ] Accessibility smoke test passes on core routes.
- [ ] Error states are understandable to a non-technical user.
- [ ] Empty states, loading states, and failure states are present for important flows.

### Manual UX Tests

- [ ] Login page
- [ ] Signup page
- [ ] Dashboard
- [ ] Employee detail
- [ ] Import flow
- [ ] Billing / pricing
- [ ] Settings
- [ ] Calendar / forecast
- [ ] Export flow

---

## Phase 10: Performance And Reliability

- [ ] Production health endpoint returns 200.
- [ ] Lighthouse run completed on public landing page.
- [ ] Lighthouse run completed on a key app page if practical.
- [ ] Performance is acceptable on initial dashboard load.
- [ ] Largest Contentful Paint is acceptable for the landing page.
- [ ] No repeated server errors appear during manual testing.
- [ ] Long-running jobs, cron jobs, and exports complete within acceptable time.
- [ ] Error boundaries and fallback states behave properly.
- [ ] Large imports are tested within expected file and row limits.
- [ ] Calendar or dashboard performance is tested with a realistic large account.
- [ ] Production cron endpoints are returning expected status codes.
- [ ] Vercel function duration and error rates are reviewed after smoke tests.

### Targets

- [ ] Lighthouse Performance >= 80 on public marketing page
- [ ] No severe console or runtime errors during smoke tests
- [ ] No known page that crashes under expected user actions

---

## Phase 11: Monitoring, Alerting, And Operations

- [ ] Sentry is receiving production errors.
- [ ] Source maps are available to Sentry.
- [ ] Uptime monitoring is configured.
- [ ] Alerts go to a monitored inbox or channel.
- [ ] Vercel deployment logs are accessible.
- [ ] Supabase logs are accessible.
- [ ] Stripe dashboard access is available to the release owner.
- [ ] First 24-hour monitoring plan is ready.
- [ ] Incident response process is documented.
- [ ] Rollback procedure is documented and understood.
- [ ] Maintenance mode process is documented and tested.
- [ ] DNS provider access is available to the release owner or backup owner.
- [ ] Support inbox access is available to the release owner or support owner.
- [ ] Admin / superadmin access recovery process is understood.
- [ ] A clear owner exists for billing incidents, data incidents, and app outages.

### Manual Ops Tests

- [ ] Trigger a safe test error and confirm it appears in Sentry.
- [ ] Open the uptime monitor and confirm the production endpoint is being checked.
- [ ] Verify who is on point for the first 24 hours after launch.
- [ ] Practice rollback on a preview or non-critical deployment if practical.

---

## Phase 12: Launch Control

- [ ] Release commit is tagged or otherwise clearly recorded.
- [ ] Release notes are written.
- [ ] Open known issues are reviewed and accepted.
- [ ] Support email is monitored.
- [ ] Team knows launch time and rollback owner.
- [ ] Customer communications are ready if applicable.
- [ ] Final go / no-go review completed.
- [ ] Launch announcement is not scheduled until `FULL GO` is approved.
- [ ] Any private beta limitation is documented if decision is `SOFT GO`.
- [ ] A post-launch review date is scheduled.

## Final Sign-Off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Release owner | | | |
| Engineering reviewer | | | |
| Product owner | | | |
| QA / tester | | | |

---

## Post-Launch First 24 Hours

- [ ] Check deploy status immediately after launch.
- [ ] Check `/api/health`.
- [ ] Check Sentry for new production errors.
- [ ] Check Stripe for webhook failures.
- [ ] Check Supabase logs for auth or RLS issues.
- [ ] Check signups, logins, and at least one core app action in production.
- [ ] Review email delivery results.
- [ ] Review uptime monitor alerts.
- [ ] Review support inbox.
- [ ] Write a short launch summary after 24 hours.

---

## Quick Reference

- Health check: `curl https://complyeur.com/api/health`
- Rollback: Vercel Dashboard -> Deployments -> Previous version -> Promote to Production
- Maintenance mode: set `NEXT_PUBLIC_MAINTENANCE_MODE=true` in Vercel and redeploy
- Runbook: `docs/RUNBOOK.md`
- Environment map: `docs/ENVIRONMENTS.md`
- Billing runbook: `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md`

## Release Notes

- Date:
- Version / tag:
- Known accepted risks:
- Follow-up actions:
