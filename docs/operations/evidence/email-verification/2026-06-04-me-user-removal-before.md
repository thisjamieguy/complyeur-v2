# Production Test User Removal - Before Snapshot

Date:
2026-06-04

Environment:
Production Supabase `complyeur-prod` (`bewydxxynjtfpytunlcq`)

Purpose:
Remove the existing confirmed test account so `jamie.guy@me.com` can be used for a fresh signup confirmation-email test.

## Target

- Email: `jamie.guy@me.com`
- Auth user id: `aef80be2-...-f2e77910563e`
- Profile id: `aef80be2-...-f2e77910563e`
- Company id: `1abdb214-...-5a09a0978665`
- Company name: `Me`
- Company slug: `me`

## Auth State

- Auth user exists: yes
- Email confirmed: yes
- Auth user created at: `2026-05-07T22:06:24.46934+00:00`
- Confirmation sent at: `2026-05-07T22:06:24.841542+00:00`
- Confirmed at: `2026-05-07T22:39:15.04241+00:00`
- Last sign-in at: `2026-05-08T08:08:11.360963+00:00`
- Auth identity providers: one `email` identity
- Auth flow state: one `email/signup` row, created `2026-05-07T22:06:24.809809+00:00`

## Profile And Company State

- Profile role: `owner`
- Profile superadmin: no
- Onboarding completed: no
- Dashboard tour completed: no
- Linked company profiles: 1
- Company Stripe customer id present: no
- Company entitlement: `free`, trial, `subscription_status=none`, no Stripe subscription id

## Dependency Summary

| Area | Table | Rows Found | Safe To Delete? | Notes |
|---|---|---:|---|---|
| Auth | `auth.users` | 1 | Yes | Confirmed test auth user for target email. |
| Auth | `auth.identities` | 1 | Yes | Email identity cascades from auth user deletion. |
| Auth | `auth.flow_state` | 1 | Yes | Stale `email/signup` flow state for target auth user. |
| Auth | `auth.sessions` | 0 | Yes | No active session rows found. |
| Auth | `auth.refresh_tokens` | 0 | Yes | No refresh token rows found. |
| Auth | `auth.one_time_tokens` | 0 | Yes | No one-time token rows found. |
| Auth | `auth.mfa_factors` | 0 | Yes | No MFA factor rows found. |
| Auth | `auth.oauth_authorizations` | 0 | Yes | No OAuth authorization rows found. |
| Auth | `auth.oauth_consents` | 0 | Yes | No OAuth consent rows found. |
| Auth | `auth.webauthn_challenges` | 0 | Yes | No WebAuthn challenge rows found. |
| Auth | `auth.webauthn_credentials` | 0 | Yes | No WebAuthn credential rows found. |
| Application | `profiles` | 1 | Yes | Only profile for target auth user/email. |
| Application | `companies` | 1 | Yes | Linked company is `Me`, created with the test profile. |
| Application | `profiles_in_company` | 1 | Yes | Company has only the target user profile. |
| Application | `company_settings` | 0 | Yes | No settings row found. |
| Application | `employees` | 0 | Yes | No employee data found. |
| Application | `employees_active` | 0 | Yes | No active employee data found. |
| Application | `trips` | 0 | Yes | No trip data found. |
| Application | `alerts` | 0 | Yes | No alert rows found. |
| Application | `audit_log` | 0 | Yes | No audit rows reference the target company or user. |
| Application | `admin_audit_log` | 0 | Yes | No admin audit rows reference the target company or user. |
| Application | `company_user_invites` | 0 | Yes | No invitations found for company, email, or inviter. |
| Application | `company_notes` | 0 | Yes | No company notes found. |
| Application | `feedback_submissions` | 0 | Yes | No feedback rows found. |
| Application | `import_sessions` | 0 | Yes | No import rows found. |
| Application | `background_jobs` | 0 | Yes | No background jobs found. |
| Application | `jobs` | 0 | Yes | No job rows found. |
| Application | `column_mappings` | 0 | Yes | No saved mappings found. |
| Application | `employee_compliance_snapshots` | 0 | Yes | No compliance snapshots found. |
| Application | `gdpr_audit_retention_checkpoints` | 0 | Yes | No retention checkpoints found. |
| Application | `tenant_integrity_quarantine` | 0 | Yes | No quarantine rows found. |
| Email | `notification_log` | 0 | Yes | No notification rows found by company, employee, or recipient email. |
| Email | `notification_preferences` | 0 | Yes | No notification preferences found. |
| Email | `onboarding_email_log` | 0 | Yes | No onboarding email log rows found. |
| Email | `waitlist` | 0 | Yes | No waitlist row found for the target email. |
| Billing | `company_entitlements` | 1 | Yes | Free trial entitlement only; no Stripe subscription id. |
| Billing | `billing_email_log` | 0 | Yes | No billing email log rows found. |
| Billing | `stripe_webhook_events` | 0 | Yes | No Stripe customer id exists on the company; no matching payload rows found. |

## Deletion Decision

Decision:
Safe to delete.

Rationale:
The account is a single-user, non-superadmin owner profile for company `Me`, with no employees, trips, invitations, audit records, active billing, Stripe customer id, or Stripe subscription id. The only application child row is a free trial entitlement created with the company.

Planned deletion scope:

- Delete stale `auth.flow_state` row for the target user.
- Delete the linked company, allowing company-owned child rows such as `company_entitlements` and the target profile to cascade through declared foreign keys.
- Delete the target auth user, allowing auth-owned rows such as `auth.identities` to cascade.

Safety notes:

- No real customer data was found in the dependency sweep.
- No secrets, token values, or email auth codes were recorded in this evidence note.
- No schema, Auth settings, or email settings will be changed.
