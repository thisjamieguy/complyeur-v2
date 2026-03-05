# Local Test Accounts

Last verified: 2026-03-04

These accounts are for local development and testing only.

## 1. Standard Product Test Account

- Email: `e2e-test@complyeur.test`
- Password: `E2ETestPassword123!`
- Intended use: normal feature testing
- Verified behavior:
  - Login succeeds
  - Lands in `/dashboard`
  - Accessing `/admin` redirects back to `/dashboard`
- Current profile state:
  - `role = owner`
  - `is_superadmin = false`

## 2. Admin Test Account

- Email: `superadmin-test@complyeur.test`
- Password: `SuperAdminTest123!`
- Intended use: admin panel testing
- Current profile state:
  - `role = manager`
  - `is_superadmin = true`
  - `onboarding_completed_at` is set

### MFA

This account is enrolled for MFA and can access `/admin` after MFA verification.

- TOTP seed: `C2ZJSE5CI6ZKUIL7YPY5CKKNT3MAEEBI`
- Add this seed manually to an authenticator app if you want to sign in interactively.
- After login, the app will send this account to `/mfa` before allowing `/dashboard` or `/admin`.

### Verified behavior

- Login succeeds
- Redirects to `/mfa`
- MFA enrollment and verification succeed
- After MFA, `/dashboard` loads and the `Admin` nav item is visible
- `/admin` loads successfully

## Notes

- The standard account is the default local feature-test user.
- The admin account is separate on purpose so admin-only testing does not contaminate the normal test path.
- If the admin account ever gets stuck on MFA, reset or re-enroll it locally rather than changing the standard account.
