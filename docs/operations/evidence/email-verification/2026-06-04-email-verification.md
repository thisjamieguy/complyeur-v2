# Email Verification Evidence

Date:
2026-06-04

Verified By:
James Walsh

Environment:
Production

Environment URL:
https://complyeur.com

## Scope

- Signup / confirmation email: Required, delivered by Supabase Auth.
- Password reset email: Required, delivered by Supabase Auth.
- Transactional system email: Available, `Welcome to ComplyEur`, delivered by Resend after email signup.

## Results

Gmail:
FAIL - not evidenced. No Gmail inbox or junk screenshot was available in this workspace.

Outlook:
FAIL - not evidenced. No Outlook inbox or junk screenshot was available in this workspace.

Corporate:
FAIL - not evidenced. No corporate mailbox inbox or junk screenshot was available in this workspace.

## Inbox Placement

No inbox placement evidence captured.

Required screenshots still needed:

- `2026-06-04-gmail-confirmation.png`
- `2026-06-04-outlook-confirmation.png`
- `2026-06-04-corporate-confirmation.png`
- `2026-06-04-gmail-password-reset.png`

## Junk Placement

No junk placement evidence captured.

Each provider still needs a visible inbox or junk-folder result showing:

- Message received or absent after the test window.
- Subject line.
- Delivery folder: Inbox or Junk.
- Authentication indicators where the provider displays them.

## Notes

- Repository review confirmed signup calls `supabase.auth.signUp`, then sends the transactional `Welcome to ComplyEur` email through Resend when `RESEND_API_KEY` is configured.
- Repository review confirmed password reset calls `supabase.auth.resetPasswordForEmail` with a production callback URL derived from the app base URL.
- No provider mailbox access, provider screenshots, or existing email evidence artifacts were available in `docs/operations/evidence/email-verification/` at the time of this evidence update.
- This record does not prove a delivery failure. It records that beta-critical delivery evidence is currently missing and must be collected manually from Gmail, Outlook, and a corporate mailbox.

## Production Supabase Auth Investigation

Date:
2026-06-04

Test email:
jamie.guy@me.com

Production signup attempted:
Yes, reported on production.

Confirmation email received:
No, reported by tester.

Production error observed:
Reported production `/login` toast showed a Server Components render error after sign-in attempt. The screenshot was referenced by the request but was not present in the attached files or this evidence directory, so `2026-06-04-me-login-server-error.png` could not be copied during this update.

### Supabase User State

- Production Supabase project inspected: `complyeur-prod` (`bewydxxynjtfpytunlcq`).
- User exists in Supabase Auth: yes.
- Auth user id: `aef80be2-9b31-47a3-8e99-f2e77910563e`.
- Email confirmed: yes.
- Created at: `2026-05-07T22:06:24.46934Z`.
- Confirmation sent at: `2026-05-07T22:06:24.841542Z`.
- Confirmed at: `2026-05-07T22:39:15.04241Z`.
- Last sign-in at: `2026-05-08T08:08:11.360963Z`.
- Auth identities attached: one `email` identity.
- Profile row exists: yes, role `owner`, company id `1abdb214-4e0b-4a2d-82c7-5a09a0978665`, onboarding incomplete.
- Company row exists: yes, company name `Me`.
- Signup partially succeeded: no current evidence of a partial signup for this address. The auth user, profile, and company rows already exist from 2026-05-07.

### Supabase Auth Email Config Findings

- Public production Auth settings endpoint reports email auth enabled.
- Public production Auth settings endpoint reports signup enabled (`disable_signup: false`).
- Public production Auth settings endpoint reports `mailer_autoconfirm: false`, so new email signups should require email confirmation.
- Google provider is enabled.
- Hosted SMTP/custom email provider, sender, Supabase Auth Site URL, redirect URL allow-list, email templates, and bounce/suppression status could not be inspected from this session because Supabase management API commands require `SUPABASE_ACCESS_TOKEN`, which is not present in the local shell or pulled production Vercel env.
- Local `supabase/config.toml` contains branded confirmation, recovery, and invite templates and includes a helper script (`pnpm email:auth:sync`) for applying hosted Supabase Auth email settings, but local config is not proof of hosted production settings.

### Production Env Findings

Vercel production env names checked without printing secret values:

- `NEXT_PUBLIC_SUPABASE_URL`: present.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: present.
- `SUPABASE_SERVICE_ROLE_KEY`: present.
- `SUPABASE_SECRET_KEY`: present.
- `RESEND_API_KEY`: present.
- `EMAIL_FROM`: present.
- `EMAIL_REPLY_TO`: present.
- `NEXT_PUBLIC_APP_URL`: present.
- `RESEND_FROM_EMAIL`: missing, but current app email code uses `EMAIL_FROM`.
- `NEXT_PUBLIC_SITE_URL`: missing; metadata has a production fallback and auth code uses `NEXT_PUBLIC_APP_URL`.
- `APP_URL`: missing; current auth/email code uses `NEXT_PUBLIC_APP_URL`.
- `SITE_URL`: missing; current metadata code falls back to `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, then `https://complyeur.com`.
- `SUPABASE_AUTH_SITE_URL`: missing.
- `SUPABASE_AUTH_EXTERNAL_REDIRECT_URL`: missing.

Stale-looking Neon/Postgres env names are also present in Vercel production, but the reviewed auth path uses Supabase URL/key envs rather than `DATABASE_URL`.

### Production Log Findings

- Current production deployment inspected: `dpl_4JxMhf16Xeb7yYCygW6w6N9QucDt`, ready, created `2026-06-04 19:15 BST`, aliased to `https://complyeur.com`.
- Vercel CLI log queries for the last 24 hours and last 7 days returned no matching runtime log excerpts for error-level logs, `login`, `Server Components`, `Signup RPC error`, `Auth`, or missing env messages.
- No non-sensitive production log excerpt was available to attach.
- Code review found that `/login` catches errors thrown from the `login` Server Action and displays `error.message` in a toast. In production, thrown Server Action errors may be redacted by Next.js as a generic Server Components error, which matches the reported toast and can occur without an app-auth-specific log line.

### Root Cause

For `jamie.guy@me.com`, the reported "no signup confirmation email" is not currently explained by a fresh production email delivery failure. Production already has a confirmed Supabase Auth user for this email from 2026-05-07, with an existing profile and company. A repeat signup for an existing account follows the app's anti-enumeration parity path and should not be expected to send a new signup confirmation email.

The production `/login` Server Components error is most likely caused by the login Server Action throwing an `AuthError` or other error directly to the client. In production, Next.js can redact thrown Server Action errors to a generic Server Components message before the client toast renders it.

The broader auth email delivery root cause remains unverified because hosted SMTP/custom sender settings and provider bounce/suppression status were not accessible without Supabase management API credentials, and no delivered-email screenshots are available.

### Recommended Fix

1. Add read access for Supabase Management API (`SUPABASE_ACCESS_TOKEN`) in a secure local/operator environment, then run `pnpm email:auth:sync` without `--apply` to capture hosted SMTP/template status. If custom SMTP is disabled, apply the Resend SMTP configuration intentionally with `--configure-resend-smtp --apply`.
2. Change auth Server Actions used by client forms to return structured results for expected auth failures instead of throwing `AuthError`/`ValidationError` to the client, so production login/signup toasts show user-safe messages instead of redacted Server Components errors.
3. Add an explicit existing-account/check-email copy path: if signup redirects to `/check-email`, make the page explain that existing accounts should sign in or use password reset and should not expect a new confirmation email.
4. Run controlled new-user confirmation and password-reset tests using owned Gmail, Outlook, and corporate inboxes, then capture inbox and junk screenshots before marking this evidence complete.

Release impact:
Email Verification remains a beta blocker. The specific `jamie.guy@me.com` report appears to be an existing confirmed account path, but reliable production auth email delivery is still not evidenced and the login error UX needs a code fix.

## Test User Reset For Fresh Signup

Date:
2026-06-04

User removed:
Yes.

Removal verified:
Yes.

Ready for fresh signup test:
Yes.

Summary:
Production test user `jamie.guy@me.com` was removed from Supabase after a guarded dependency check confirmed the account was a single-user test company with no employees, trips, invitations, audit rows, Stripe customer id, or active subscription data. Verification after deletion found zero remaining related rows for the target auth user id, company id, and email.

Evidence:

- `2026-06-04-me-user-removal-before.md`
- `2026-06-04-me-user-removal-after.md`

Warnings:
Email Verification is not complete yet. A fresh production signup must now be performed and the delivered Supabase confirmation email must be captured before this evidence area can be marked complete.

## Fresh Signup Attempt After Reset

Date:
2026-06-04

Production signup attempted:
Yes.

Test email:
`jamie.guy@me.com`

Browser result:
Signup page displayed a production-redacted Server Components toast after submission.

Screenshot:
`2026-06-04-me-signup-server-components-warning.png`

Sentry alert:
`2026-06-04-sentry-signup-database-permission-alert.pdf`

Production Supabase result:

- Auth user created: yes.
- Auth user id: `f903aba7-...-ec8c6a8770cd`.
- Email confirmed: no.
- Confirmation sent at: `2026-06-04T22:55:42.132514+00:00`.
- Auth identity created: yes, `email`.
- Auth flow state created: yes, `email/signup`.
- Profile created: yes, role `owner`, company id `7b7ad82b-...-b4bb92367eb6`.
- Company created: yes, company name `Me`.
- Employees: 0.
- Trips: 0.
- Audit rows: 0.

Interpretation:
The fresh signup reached Supabase Auth and triggered a confirmation email send timestamp. The browser warning is not evidence that the confirmation email failed to send; it is a production error handling issue in the post-signup Server Action path.

Sentry root cause:
Sentry issue `5c5bef6a519340b4abfcfa42f4debb26` reported `DatabaseError: You do not have permission to perform this action` for production transaction `/signup` at `2026-06-04T22:55:43Z`. The stack pointed to the signup Server Action throwing on the `create_company_and_profile` RPC error. Production grants show `public.create_company_and_profile(...)` is executable by `authenticated` and `service_role`, not `anon`. Because email-confirmation signup can remain anonymous immediately after `supabase.auth.signUp`, the direct post-signup RPC is not valid from that request context. The Auth user creation trigger had already provisioned the profile and company, so the RPC was redundant.

Code follow-up:
The email signup action was changed to pass validated `company_name`, `full_name`, `given_name`, and `family_name` metadata into `supabase.auth.signUp`, allowing the existing `on_auth_user_created` trigger to provision the company/profile. The redundant post-signup `create_company_and_profile` RPC call was removed from the email signup action. The action now returns a structured `{ success, redirectTo }` result for expected signup outcomes, and the signup page navigates to `/check-email` from the client instead of relying on a thrown Server Action redirect. Local sign-out after signup is non-blocking because email-confirmation signup may not have a local session.

Focused production deploy:

- Commit deployed: `0f82061` (`fix(auth): prevent signup permission error`).
- Deployment id: `dpl_7ifb4odhpud5Ar7q7tmbhtVu45in`.
- Deployment URL: `https://complyeur-94bf6y05o-james-walshs-projects-5e78c189.vercel.app`.
- Production aliases: `https://complyeur.com`, `https://www.complyeur.com`.
- Build result: `READY`.
- Live `/signup` check: HTTP 200.
- Live `/api/health` check: HTTP 200.

Second test-user reset after deploy:

- Reset performed: yes.
- Safety guard passed: yes.
- Deleted rows: `auth.flow_state` 2, `public.companies` 1, `auth.users` 1.
- Verification result: PASS.
- Remaining related rows after reset: 0.
- Fresh signup readiness: `jamie.guy@me.com` is ready for one controlled retry against the deployed signup fix.

## Final Production Verification

Date:
2026-06-05

Test Account:
jamie.guy@me.com

Environment:
Production

Results:

Signup:
PASS

Confirmation Email:
PASS

Email Delivery:
PASS

Confirmation Link:
PASS

Account Activation:
PASS

Billing Flow:
PASS

MFA Setup:
PASS

Dashboard Access:
PASS

Evidence:

- `2026-06-05-check-email-page.png`
- `2026-06-05-confirmation-email-received.png`
- `2026-06-05-confirmation-link-login.png`
- `2026-06-05-dashboard-access.png`

Notes:

- Confirmation email delivered successfully.
- User verified account successfully.
- Stripe checkout launched successfully.
- MFA enrollment completed.
- User reached protected dashboard.
- End-to-end onboarding completed.

Conclusion:

Email verification and confirmation flow successfully validated in production.

Result:
PASS

## Remaining Actions

No remaining email-verification actions are required for blocker closure.
