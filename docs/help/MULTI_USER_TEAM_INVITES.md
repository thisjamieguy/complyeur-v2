# Multi-User Team Invites (Help Draft)

Last validated: February 17, 2026 (local Supabase + Mailpit)

## What this supports
- The first user who signs up for a company account is the company `owner`.
- Owners and admins can invite teammates from `Settings > Team`.
- Team invites are limited by your plan seat limit (`active users + pending invites`).
- Invite emails are sent as magic-link invites.
- Invited users are added to the same company account after accepting.

## How to invite a team member
1. Go to `Settings > Team`.
2. In **Invite Team Member**, enter your teammate’s email.
3. Choose a role: `Admin`, `Manager`, or `Employee`.
4. Click **Send Invite**.

## What happens after invite
- The teammate receives an email titled **"You have been invited"**.
- The link routes through Supabase Auth and into your app callback.
- The user is added to your company with the invited role.

## Seat limits
- Seat usage is shown at the top of Team settings.
- When the limit is reached, invites are blocked.
- Error shown: `User limit reached for current tier (...)`.

## Permissions
- Only `owner` and `admin` can manage invites and team roles.
- `manager` and `employee` cannot invite users.
- Server-side RLS also blocks unauthorized invite writes.

## Existing-account invite behavior
If the invited email already has an auth account, the inviter sees:
- `Invite saved. This user already has an account, so ask them to use the invite link to join your company.`

Current behavior to note:
- A pending invite is created.
- If that user already has a profile in another company, they are not automatically moved to the inviter company.

## Onboarding invite behavior
Status: aligned with Team settings as of this update.

- Onboarding invite action now also sends magic-link invite emails.
- It uses the same invite-dispatch logic as `Settings > Team`.
- On non-recoverable email send failures, the invite row is revoked.

## Troubleshooting
- If Team page shows `Failed to load team invites`, confirm local DB migrations are up to date.
- For local email checks, use Mailpit at `http://127.0.0.1:54324`.
- Confirm `NEXT_PUBLIC_APP_URL` points to your local app URL in local testing.

## Internal implementation references
- `app/(dashboard)/settings/team/actions.ts`
- `app/(onboarding)/onboarding/actions.ts`
- `app/auth/callback/route.ts`
- `lib/services/team-invites.ts`
- `supabase/migrations/20260206143000_owner_roles_and_team_invites.sql`
- `supabase/migrations/20260217100000_add_onboarding_tracking.sql`
