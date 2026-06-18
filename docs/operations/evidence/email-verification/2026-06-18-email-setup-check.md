# Email Setup Check

Date: 2026-06-18

Environment: Production configuration, Resend dashboard, local operator checks

## Result

PARTIAL PASS

The Resend application email path is working. Hosted Supabase Auth SMTP is now
configured to use Resend, and hosted Auth templates have been synced. Email
verification is still partial until a fresh signup confirmation, password reset,
and invite are received in real inboxes and their links are tested.

## Verified

- Resend domain `complyeur.com` is verified.
- Resend sending is enabled in region `eu-west-1`.
- Resend reports DKIM and SPF records verified.
- DNS helper result:
  - SPF: PASS
  - DMARC: PASS
  - DKIM selector `resend`: PASS
- Direct Resend SDK smoke test delivered:
  - Message id: `2e7b15d9-7b0b-4403-a246-ee3db3f9487b`
- Welcome-template smoke test delivered:
  - Message id: `4829457c-98a3-40cb-a20f-e686c01262b9`
- `EMAIL_ASSET_BASE_URL=https://complyeur.com` was added to Vercel Production,
  Preview, and Development environments.
- Resend recent sent-email history includes app transactional emails and welcome
  emails, but no Supabase Auth confirmation or password-recovery subjects.
- Hosted Supabase Auth custom SMTP check:
  - External email enabled: yes
  - SMTP host: `smtp.resend.com`
  - SMTP port: `465`
  - Sender: `ComplyEur.com <hello@complyeur.com>`
- Hosted Supabase Auth templates synced on 2026-06-18:
  - Confirmation
  - Recovery
  - Invite

## Production Data Checks

Read-only production Supabase checks found:

- Current Auth user list does not include a recent unconfirmed signup account.
- Recent company rows exist without matching recent profile/Auth rows.
- `Titleys.net` exists as an orphan company row from `2026-06-07T21:06:55Z`;
  there is no matching profile for the tester's corrected Outlook address.
  Dependency counts show no employees, trips, audit rows, imports, alerts,
  notification rows, or settings; only the default entitlement row is attached.
- The corrected Outlook tester address has no current Auth user and no current
  profile in production. Resend history shows app-level welcome/test emails to
  that address, but this does not prove Supabase Auth confirmation delivery.
- A separate orphan `ComplyEur` company row from `2026-06-05T05:43:13Z` has no
  profile, but it does have one employee and settings attached, so it needs a
  separate cleanup decision rather than automatic deletion.
- `companies.email` does not exist in production, while onboarding and billing
  cron routes previously selected that column.

## Production Cleanup

After explicit operator approval on 2026-06-18:

- The empty orphan `Titleys.net` company was deleted.
- The three existing production test Auth users were deleted.
- Their linked profile/company workspaces and dependent employee, trip, import,
  notification, settings, and entitlement rows were removed by foreign-key
  cascades.
- `admin_audit_log` rows where those test users were the admin actor were
  removed during the transaction because they blocked profile deletion.
- `audit_log.user_id` references for those test users were allowed to cascade to
  `NULL` during the transaction.
- The immutable audit triggers were re-enabled before commit and verified as
  enabled afterwards.

Post-cleanup verification:

- Auth users: `0`
- Profiles: `0`
- Deleted target companies remaining: `0`
- Target audit references remaining: `0`
- One separate orphan `ComplyEur` company remains with one employee and no
  profile. This was not deleted in this cleanup pass.

Code follow-up completed in this pass:

- Onboarding and billing cron email recipients now resolve from profile email by
  role priority instead of `companies.email`.
- The email DNS helper now accepts Resend DKIM public-key records that begin
  with `p=`.
- Signup confirmation links now pass an explicit
  `emailRedirectTo=https://complyeur.com/auth/callback?...` value from the app
  signup action instead of relying only on hosted redirect defaults.

## Still Required

1. Test fresh signup confirmation, password reset, and team invite delivery to
   owned Gmail, Outlook, and corporate inboxes.
2. Record inbox and junk-folder screenshots before closing email verification.
3. Remove the empty `Titleys.net` orphan company only after explicit production
   cleanup approval.
4. Separately review the `ComplyEur` orphan company because it has an employee
   and settings attached.

## Interpretation

The tester's missed confirmation email is not explained by Resend SDK delivery:
Resend is sending and delivering application emails. The Supabase Auth email
path has now been configured to use Resend SMTP, but delivery needs a fresh
signup test because the corrected Outlook tester address currently has no Auth
user or profile.

For the Titleys case specifically, Resend shows the application welcome email as
delivered on `2026-06-07`, but there is no corresponding Supabase Auth
confirmation email in Resend and no current Auth user/profile for the corrected
tester address. The empty `Titleys.net` orphan company has been removed after
explicit production cleanup approval. The tester should retry signup now that
Supabase Auth SMTP is configured.
