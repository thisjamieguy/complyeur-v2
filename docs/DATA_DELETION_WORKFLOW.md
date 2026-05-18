# GDPR Data Deletion Workflow

**Version:** 1.0
**Last updated:** 30 March 2026
**Legal basis:** GDPR Article 17 (Right to Erasure) / UK GDPR Article 17

This document describes the end-to-end procedure for actioning a Right to Erasure (GDPR "right to be forgotten") request. It covers deletion from all systems where personal data is held: Supabase (primary database), Stripe (billing), and Resend (email).

Anyone actioning a deletion request must complete **all** steps in this document. Partial deletion is not acceptable.

---

## 1. Request Intake

### Channels

Deletion requests may arrive via:

- **Email** to `privacy@complyeur.com`
- **Manual request via support/admin** for company-account deletion
- **Written request** to the postal address listed in the Privacy Policy

### Before acting

1. **Verify identity.** For email requests, confirm the requestor controls the account email address by sending a verification email to that address and requiring a reply. Do not action requests from unverified parties.
2. **Log the request.** Record in the admin audit log: requestor email, date received, channel, and your name as the handler.
3. **Check exemptions.** GDPR Article 17(3) permits retention of data where necessary for compliance with a legal obligation (e.g., tax records), for public interest, or to establish/defend legal claims. If any exemption applies, document it and notify the requestor within 30 days.
4. **Respond within 30 days.** GDPR requires a response within one calendar month. If the request is complex, the deadline may be extended by two further months with notice to the requestor.

---

## 2. Current Product Scope

ComplyEUR currently provides **employee-level** GDPR tooling in-app:

1. Company owners and administrators can generate employee DSAR exports.
2. Company owners and administrators can soft-delete or anonymize employee records.
3. Soft-deleted employee records enter a **30-day recovery window** before permanent deletion by the nightly GDPR retention cron job (`/api/gdpr/cron/retention`).

ComplyEUR does **not** currently provide a self-service company/account deletion flow in Settings. Company-level deletion requests are handled manually by the privacy/admin team using the process below.

---

## 3. Manual Deletion — Supabase (Primary Database)

Use these steps when processing a deletion request that did not come through the in-app flow, or to verify a completed self-service deletion.

### 3.1 Identify the company record

```sql
-- Find the requestor profile and linked company (use Supabase SQL Editor on production project)
SELECT p.id, p.email, p.company_id, c.name, c.created_at
FROM profiles p
JOIN companies c ON c.id = p.company_id
WHERE p.email = '<requestor-email>';
```

Note the `company_id` (UUID). This is the scope for all deletion steps.

### 3.2 Company-level deletion handling

There is no `companies.deleted_at` workflow in the current schema. For company/account deletion requests:

1. Verify the requestor and collect the `company_id`.
2. Suspend or otherwise block account access through admin controls before data removal.
3. Remove operational company data from the application database.
4. Retain GDPR audit evidence for the documented retention period before final company-row cleanup if needed.

### 3.3 Remove operational company data

Run the following in the Supabase SQL Editor on the **production** project (`bewydxxynjtfpytunlcq`). Execute in order — foreign key constraints require child records to be deleted before parent records.

```sql
-- 1. Delete all trips for employees under this company
DELETE FROM trips WHERE company_id = '<company-id>';

-- 2. Delete compliance snapshots
DELETE FROM employee_compliance_snapshots WHERE company_id = '<company-id>';

-- 3. Delete import sessions and column mappings
DELETE FROM import_sessions WHERE company_id = '<company-id>';
DELETE FROM column_mappings WHERE company_id = '<company-id>';

-- 4. Delete employees
DELETE FROM employees WHERE company_id = '<company-id>';

-- 5. Delete notification log entries
DELETE FROM notification_log WHERE company_id = '<company-id>';

-- 6. Delete alerts
DELETE FROM alerts WHERE company_id = '<company-id>';

-- 7. Delete company settings and entitlements
DELETE FROM company_settings WHERE company_id = '<company-id>';
DELETE FROM company_entitlements WHERE company_id = '<company-id>';

-- 8. Delete background jobs
DELETE FROM background_jobs WHERE company_id = '<company-id>';

-- 9. Audit log handling
-- audit_log is retained for 90 days for security and accountability.
-- A scheduled retention function purges eligible rows automatically and
-- preserves a hash-chain checkpoint for later verification.
-- Do not manually delete audit_log rows unless legal counsel approves it.

-- 10. Delete the company record only after audit-log retention obligations
-- and any financial/legal holds have been reviewed.
DELETE FROM companies WHERE id = '<company-id>';
```

### 3.4 Delete the Supabase Auth user

The Auth user record in `auth.users` is separate from the application data. To delete it:

1. Open the Supabase Dashboard → Production project → Authentication → Users.
2. Search for the user by email address.
3. Click the user row → "Delete User".

Or via the Admin API (use only from a secure server context with `SUPABASE_SERVICE_ROLE_KEY`):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { error } = await supabase.auth.admin.deleteUser('<auth-user-id>')
if (error) throw error
```

### 3.5 Verify deletion

```sql
-- Confirm no data remains
SELECT COUNT(*) FROM trips WHERE company_id = '<company-id>';
SELECT COUNT(*) FROM employees WHERE company_id = '<company-id>';
SELECT COUNT(*) FROM companies WHERE id = '<company-id>';
```

All counts should be 0.

---

## 4. Manual Deletion — Stripe

Stripe retains billing and payment records for legal and regulatory reasons (financial record-keeping obligations). We cannot delete payment history. We can:

1. **Cancel the subscription** (if active):
   - Stripe Dashboard → Customers → search by email → Subscriptions → Cancel.
   - Or via CLI: `stripe subscriptions cancel <sub_id>`

2. **Delete the customer object**:
   - Stripe Dashboard → Customers → search by email → Delete Customer.
   - Deleting a customer in Stripe removes their payment methods and personal data from Stripe's systems. Historical charge records are retained for regulatory compliance and cannot be deleted.

3. **Record in admin log** that Stripe customer deletion was completed.

> Stripe's data retention policy means that transaction records are kept for a period required by financial regulations. This is a lawful exemption under GDPR Article 17(3)(b) (legal obligation). Inform the requestor of this in your deletion confirmation.

---

## 5. Manual Deletion — Resend

Resend does not store message content after delivery, but does retain metadata (recipient address, send timestamp, delivery status) in its logs.

1. Log in to the Resend dashboard.
2. Navigate to Emails → search by recipient address.
3. There is no bulk-delete API in Resend's current version. Email logs are retained per Resend's own retention policy (typically 30–90 days) and purge automatically.
4. If the requestor specifically requires earlier removal, contact Resend support at `support@resend.com` with the request and the recipient email address.

---

## 6. Confirm and Notify the Requestor

Once all steps above are complete:

1. Send a deletion confirmation email to the requestor from `privacy@complyeur.com`:

   > Subject: Confirmation of Account Deletion — ComplyEUR
   >
   > Dear [Name],
   >
   > We confirm that your ComplyEUR account and all associated personal data have been deleted from our systems as of [date].
   >
   > Please note: payment transaction records are retained by our payment processor (Stripe) for the minimum period required by financial regulations. This is a legal obligation we are unable to override. All other personal data — employee records, trip data, and account information — has been permanently deleted.
   >
   > If you have any questions, please contact privacy@complyeur.com.
   >
   > Regards,
   > ComplyEUR Privacy Team

2. Update the admin audit log with:
   - Date of completion
   - Steps taken (Supabase ✓, Stripe ✓, Resend ✓)
   - Date confirmation email was sent

---

## 7. DSAR (Data Subject Access Requests)

A DSAR is a request to **receive** a copy of personal data, not to delete it. The process is:

1. Verify identity (same as step 1 above).
2. Use the in-app GDPR export feature: Dashboard → GDPR → Export employee data. This exports the employee record, linked trips, alerts, notification logs, stored compliance snapshots where present, and a current compliance calculation generated at export time.
3. For account-level data outside the employee GDPR tool, use the admin tooling and database review as needed.
4. Deliver the export to the requestor securely (encrypted email or a time-limited secure download link). Do not send unencrypted PII by email.
5. Respond within 30 days.

---

## 8. Retention Schedule Reference

| Data Category | Retention Period | Basis |
|---------------|-----------------|-------|
| Active account data (employees, trips) | Duration of active subscription | Contract (GDPR Art. 6(1)(b)) |
| Soft-deleted accounts | 30 days from deletion request | User recovery window |
| Encrypted backups | 90 days from creation | Disaster recovery |
| GDPR audit log entries | 90 days from event | Security, accountability, and fraud prevention |
| Stripe transaction records | As required by financial law (typically 7 years) | Legal obligation (GDPR Art. 17(3)(b)) |
| Email delivery metadata (Resend) | 30–90 days (Resend's retention) | Automatic purge |

---

## 9. Escalation

If you are unsure whether an exemption applies, whether a request is valid, or if the requestor disputes the outcome:

- Escalate to the Data Protection Officer at `dpo@complyeur.com`.
- For UK subjects: the ICO can be contacted at [ico.org.uk](https://ico.org.uk) if the requestor is not satisfied with the outcome.
- For EEA subjects: the relevant national supervisory authority for the requestor's country of residence.

Document any escalation in the admin audit log.
