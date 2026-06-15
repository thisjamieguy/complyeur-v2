# Production Test User Removal - After Verification

Date:
2026-06-04

Environment:
Production Supabase `complyeur-prod` (`bewydxxynjtfpytunlcq`)

Target email:
`jamie.guy@me.com`

## Result

PASS

The production test user reset completed and verification found no remaining auth, profile, company, billing, employee, trip, invitation, audit, notification, or waitlist rows tied to the target email, target auth user id, or target company id.

## Deleted Rows

| Table | Rows Deleted | Notes |
|---|---:|---|
| `auth.flow_state` | 1 | Stale `email/signup` flow-state row for the target auth user. |
| `public.companies` | 1 | Linked company `Me`; declared foreign keys cascaded the target profile and free trial entitlement. |
| `auth.users` | 1 | Target auth user; declared foreign keys cascaded the email identity. |

## Verification Summary

| Area | Table | Remaining Rows |
|---|---|---:|
| Auth | `auth.users` | 0 |
| Auth | `auth.identities` | 0 |
| Auth | `auth.flow_state` | 0 |
| Auth | `auth.sessions` | 0 |
| Auth | `auth.refresh_tokens` | 0 |
| Auth | `auth.one_time_tokens` | 0 |
| Application | `profiles` | 0 |
| Application | `companies` | 0 |
| Application | `company_settings` | 0 |
| Application | `employees` | 0 |
| Application | `trips` | 0 |
| Application | `alerts` | 0 |
| Application | `audit_log` | 0 |
| Application | `admin_audit_log` | 0 |
| Application | `company_user_invites` | 0 |
| Application | `company_notes` | 0 |
| Application | `feedback_submissions` | 0 |
| Application | `import_sessions` | 0 |
| Application | `background_jobs` | 0 |
| Application | `jobs` | 0 |
| Application | `column_mappings` | 0 |
| Application | `employee_compliance_snapshots` | 0 |
| Application | `gdpr_audit_retention_checkpoints` | 0 |
| Application | `tenant_integrity_quarantine` | 0 |
| Email | `notification_log` | 0 |
| Email | `notification_preferences` | 0 |
| Email | `onboarding_email_log` | 0 |
| Email | `waitlist` | 0 |
| Billing | `company_entitlements` | 0 |
| Billing | `billing_email_log` | 0 |

## Notes

- Deletion was guarded by a production safety check requiring exactly one matching auth user, one matching profile, one linked company, one profile in the linked company, zero employees, zero trips, zero alerts, zero audit rows, zero invitations, no Stripe customer id, and no risky entitlement with a Stripe subscription or non-`none` subscription status.
- The safety guard passed before deletion.
- No production schema, Supabase Auth setting, email setting, or application code was changed.
- `jamie.guy@me.com` is ready for a fresh production signup confirmation-email test.
