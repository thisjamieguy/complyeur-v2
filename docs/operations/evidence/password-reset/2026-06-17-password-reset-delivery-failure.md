## Password Reset Delivery Failure

Date: 2026-06-17

Verified By: James Walsh

Environment: Production

Account tested: existing production account `jamesw@ies.co.uk`

## Result

FAIL

- Password reset request form loaded successfully.
- Password reset request submission succeeded and the app displayed the expected
  confirmation state: `Check your email for a password reset link`.
- A separate browser pane showed the existing authenticated session for the same
  account at the time of the test.
- No password reset email arrived for the tested existing account after the
  request.
- Because no email arrived, reset-link use, link reuse, and post-reset session
  behavior could not be completed.

## Evidence

- `Screenshot 2026-06-17 at 23.22.56.png`
- `Screenshot 2026-06-17 at 23.23.09.png`
- `Screenshot 2026-06-17 at 23.23.13.png`
- `Screenshot 2026-06-17 at 23.23.15.png`

## Interpretation

The production UI and server action path accepted the password reset request,
but hosted Supabase Auth recovery-email delivery did not complete for a known
existing account. This is a production auth-email delivery/configuration issue,
not just a missing manual-evidence gap.

## Next Action

- Inspect hosted Supabase Auth email configuration, sender/template state, and
  suppression or bounce status using Supabase management access.
- Run `pnpm email:auth:sync` in a secure operator environment with
  `SUPABASE_ACCESS_TOKEN` to compare hosted Auth email settings with repo
  expectations.
- If hosted custom SMTP is disabled or misconfigured, re-run with
  `--configure-resend-smtp --apply` intentionally after review.
