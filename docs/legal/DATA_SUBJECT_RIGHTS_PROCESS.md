# Data Subject Rights Operating Process

Last reviewed: 2026-06-24

This process covers GDPR / UK GDPR rights requests for ComplyEur account users,
customer-managed employees/travellers, and prospects. It is operational guidance,
not legal advice.

## Request Channels

- `privacy@complyeur.com`
- `support@complyeur.com` escalated to the privacy owner
- Written or contractual customer request
- In-app GDPR tools for employee-level owner/admin actions

## Roles

| Role | Responsibility |
| --- | --- |
| Privacy owner | Owns request log, deadline, response decision, and escalation |
| Engineering owner | Runs exports, deletion/anonymisation, retention verification, and technical searches |
| Support owner | Handles requester communication and identity checks |
| Customer controller | Validates employee/traveller requests where the customer controls the data |
| Legal counsel / DPO | Reviews complex requests, exemptions, disputes, and transfer/processor questions |

## Intake Steps

1. Record the request date, requester, channel, request type, customer/company,
   and initial deadline in the DSR log.
2. Classify the requester:
   - Customer account user.
   - Customer-managed employee/traveller.
   - Prospect/waitlist/contact.
   - Unknown or third party.
3. Verify identity before disclosure or deletion:
   - Account user: confirm control of account email or authenticated session.
   - Employee/traveller: route through the customer controller unless ComplyEur
     has direct controller responsibility for the data.
   - Third party: require written authority before disclosing anything.
4. Start the one-calendar-month response clock from verified receipt. If the
   request is complex, document extension rationale and notify the requester
   before the first month expires.

## Rights Handling

| Right | Handling |
| --- | --- |
| Access / portability | Use employee DSAR export for employee-linked app data. Use account-level manual process for profiles, auth, billing, notification preferences, support/feedback, logs, processors, and backups. |
| Rectification | Correct account settings/profile data or direct the customer controller to correct employee/trip records. |
| Erasure | Use in-app employee soft-delete/anonymise/hard-delete workflows where applicable. Use manual account deletion workflow for company/account data. Retain billing/audit records where legal obligation or legitimate interest applies. |
| Restriction | Suspend relevant processing or account access where technically feasible; document limits where processing is needed for security/legal obligations. |
| Objection | Stop non-essential communications and analytics where applicable. Assess legitimate-interest processing case by case. |
| Withdraw consent | Cookie settings panel and unsubscribe/email preference flows control consent-based processing. |

## Employee-Level DSAR Export

The in-app export includes:

- Employee record.
- Trips.
- Alerts.
- Notification logs.
- Matched retained import-session rows.
- Stored compliance snapshots.
- Current generated compliance calculation.
- `metadata.json`.
- `dsar_manifest.json` with included stores and documented exclusions.

## Account-Level Manual DSR Process

For account users, manually review and export or action:

- `profiles`.
- `notification_preferences`.
- `company_user_invites`.
- `audit_log` and admin/security audit records where disclosure is appropriate.
- `feedback_submissions`.
- Billing records and Stripe customer/subscription metadata.
- Supabase Auth user metadata.
- Resend delivery metadata.
- Sentry/Vercel/Supabase operational logs where searchable and proportionate.
- CookieYes/GA4 data where identifiable and available.
- Backups as a documented restore-only limitation.

## Response Package

Every completed request should include:

- Request type and date received.
- Identity verification method.
- Scope of systems searched.
- Data provided, corrected, deleted, anonymised, restricted, or retained.
- Legal/operational reason for retained data.
- Processor-managed stores and how they were handled.
- Backup limitation wording where relevant.
- Contact/escalation route and supervisory authority reference where applicable.

## Security Rules

- Do not send unencrypted ZIP exports by ordinary email.
- Use short-lived signed URLs or encrypted transfer where possible.
- Do not disclose another tenant's data while verifying a request.
- Cross-tenant and nonexistent identifiers must receive non-disclosing denial.
- Log the action in the privacy/audit log without copying raw sensitive payloads.

## Verification Before Public Release

- [ ] Owner/admin same-tenant employee DSAR export succeeds.
- [ ] Non-admin employee DSAR export is denied.
- [ ] Cross-tenant employee DSAR request is denied with non-disclosing response.
- [ ] Account-level DSR dry run completed for a test account.
- [ ] Deletion/anonymisation verification confirms direct identifiers are removed
  from app-owned employee-linked stores.
- [ ] Retention cron rejects missing/invalid secret and succeeds with valid secret.
