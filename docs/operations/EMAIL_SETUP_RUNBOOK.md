# Email Setup Runbook

Last reviewed: 2026-06-18

## Purpose

This runbook tracks ComplyEur's product email setup and the checks required
before beta or public release.

Resend should remain the primary email provider for now. The app already uses
the Resend SDK for product transactional emails, and Supabase Auth can use
Resend SMTP for signup confirmation, password reset, and invite emails.

## Current Status

Local environment files checked on 2026-06-18:

- `RESEND_API_KEY`: present in `.env.local` and `.env.production.sync`.
- `EMAIL_FROM`: present in `.env.local` and `.env.production.sync`.
- `EMAIL_REPLY_TO`: present in `.env.local` and `.env.production.sync`.
- `NEXT_PUBLIC_APP_URL`: present in `.env.local` and `.env.production.sync`.
- `SUPABASE_ACCESS_TOKEN`: available to the operator on 2026-06-18 for the
  hosted Auth email sync. Remove it from local env files after this setup work.

Recent evidence:

- Signup confirmation was previously evidenced in production on 2026-06-05.
- Password reset delivery failed for a known existing production account on
  2026-06-17. See
  `docs/operations/evidence/password-reset/2026-06-17-password-reset-delivery-failure.md`.
- Resend SDK smoke test delivered on 2026-06-18 with message id
  `2e7b15d9-7b0b-4403-a246-ee3db3f9487b`.
- Resend welcome-template smoke test delivered on 2026-06-18 with message id
  `4829457c-98a3-40cb-a20f-e686c01262b9`.
- Resend recent sent-email history shows app transactional emails, including
  welcome emails, but no recent Supabase Auth confirmation or recovery subjects
  before the hosted Auth email sync.
- `node scripts/beta/check-email-dns.mjs --domain complyeur.com --dkim-selector resend`
  passed SPF, DMARC, and DKIM on 2026-06-18.
- `pnpm email:auth:sync` confirmed hosted Supabase Auth custom SMTP is enabled
  and points at `smtp.resend.com:465`.
- `pnpm email:auth:sync -- --apply` synced hosted confirmation, recovery, and
  invite templates plus the `ComplyEur.com <hello@complyeur.com>` sender on
  2026-06-18.

Vercel env names checked on 2026-06-18:

- `RESEND_API_KEY`: present for Production, Preview, and Development.
- `EMAIL_FROM`: present for Production, Preview, and Development.
- `EMAIL_REPLY_TO`: present for Production, Preview, and Development.
- `NEXT_PUBLIC_APP_URL`: present for Production.
- `CRON_SECRET`: present for Production.
- `EMAIL_ASSET_BASE_URL`: present for Production, Preview, and Development.

Resend domain checked on 2026-06-18:

- `complyeur.com`: verified.
- Region: `eu-west-1`.
- Sending: enabled.
- DKIM and SPF records: verified in Resend.

## Email Inventory

| Email | Provider path | Current repo wiring | Setup status |
| --- | --- | --- | --- |
| Signup confirmation | Supabase Auth via SMTP | `supabase/templates/auth/confirmation.html`, triggered by `supabase.auth.signUp` in `app/(auth)/actions.ts` | Hosted SMTP configured and template synced. Needs fresh inbox/link evidence. |
| Password reset | Supabase Auth via SMTP | `supabase/templates/auth/recovery.html`, triggered by `forgotPassword` in `app/(auth)/actions.ts` | Hosted SMTP configured and template synced. Needs fresh inbox/link evidence. |
| Team invite | Supabase Auth via SMTP | `supabase/templates/auth/invite.html`, triggered by `dispatchInviteEmail` in `lib/services/team-invites.ts` | Hosted SMTP configured and template synced. Needs fresh inbox/link evidence. |
| Welcome email | Resend SDK | `sendWelcomeEmail` in `lib/services/email-service.ts`, called after email signup | Wired. Test with `pnpm email:welcome:test`. |
| Waitlist confirmation | Resend SDK | `sendWaitlistEmail` in `lib/services/waitlist-email.ts`, called from landing waitlist action | Wired. Needs live inbox test if waitlist remains active. |
| Compliance alert | Resend SDK | `sendAlertEmail` in `lib/services/email-service.ts`, called by alert detection service | Wired. Requires alert settings and notification log verification. |
| Onboarding day 1 | Resend SDK and Vercel Cron | `/api/cron/onboarding`, tracked by `onboarding_email_log` | Wired. Cron is present in `vercel.json`. |
| Onboarding day 3 | Resend SDK and Vercel Cron | `/api/cron/onboarding`, tracked by `onboarding_email_log` | Wired. Cron is present in `vercel.json`. |
| Trial expiring | Resend SDK and Vercel Cron | `/api/cron/billing`, tracked by `billing_email_log` | Wired. Cron is present in `vercel.json`. |
| Upcoming renewal | Resend SDK and Vercel Cron | `/api/cron/billing`, tracked by `billing_email_log` | Wired. Cron is present in `vercel.json`. |
| Payment failed | Resend SDK and Stripe webhook | `invoice.payment_failed` handler in `app/api/billing/webhook/route.ts` | Wired. Covered by unit tests. |
| Operational beta alerts | Resend SDK and Vercel Cron | `/api/cron/beta-monitoring` | Wired. Recipient comes from `ZERO_SIGNUP_ALERT_RECIPIENT`, then `EMAIL_REPLY_TO`, then support fallback. |
| DSAR or deletion confirmation | Manual support process | `docs/DATA_DELETION_WORKFLOW.md` | Not automated. Keep manual unless support volume requires automation. |

## Required Configuration

Resend:

- Verified sending domain, ideally `complyeur.com` or a dedicated auth subdomain.
- SPF, DKIM, and DMARC records passing in Resend.
- API key stored only in environment variables as `RESEND_API_KEY`.
- Sender stored as `EMAIL_FROM`, for example `ComplyEur <hello@complyeur.com>`.
- Reply address stored as `EMAIL_REPLY_TO`, for example `support@complyeur.com`.
- Optional `EMAIL_ASSET_BASE_URL=https://complyeur.com` so email images use a
  stable production origin even when preview deployments send test emails.

Supabase Auth SMTP:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: `RESEND_API_KEY`
- Sender email and sender name must match the verified Resend domain.

Operator-only local variable:

- `SUPABASE_ACCESS_TOKEN` from the Supabase dashboard account tokens page.
  Do not commit it. Remove it from local env files after the hosted config check
  or apply step is complete.

## Setup Procedure

1. Verify the Resend domain in the Resend dashboard.
2. Confirm `EMAIL_FROM` uses that verified domain.
3. Add `SUPABASE_ACCESS_TOKEN` temporarily in the secure operator environment.
4. Run a hosted Supabase Auth dry-run:

   ```bash
   pnpm email:auth:sync
   ```

5. Apply the repo templates and sender settings. Add
   `--configure-resend-smtp` only if the dry-run reports disabled or incomplete
   custom SMTP:

   ```bash
   pnpm email:auth:sync -- --apply
   ```

6. Send a direct Resend SDK smoke test to an owned inbox:

   ```bash
   pnpm email:test you@example.com
   ```

7. Send the welcome email template to an owned inbox:

   ```bash
   pnpm email:welcome:test you@example.com "Test User" "ComplyEur Test Workspace"
   ```

8. Run controlled hosted Auth tests with owned Gmail, Outlook, and corporate
   inboxes:

   - New-user signup confirmation.
   - Existing-user password reset.
   - Team invite to a test address.
   - Check Inbox and Junk folders.
   - Capture screenshots of received subject, sender, folder, and link result.

9. Update the evidence records under `docs/operations/evidence/`.

## Notes

- Resend MCP is optional for agent-assisted manual sending. It is not required
  for the product email system.
- Marketing or broadcast email should not be sent until unsubscribe handling,
  consent basis, and audience ownership are explicitly reviewed.
- Do not use Supabase's default Auth email service for production. It is only a
  development fallback and has restrictive delivery limits.
