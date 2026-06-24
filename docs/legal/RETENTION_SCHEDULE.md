# Personal Data Retention Schedule

Last reviewed: 2026-06-24

This schedule maps personal-data stores to retention triggers, disposal method,
and evidence. Legal must confirm statutory/tax retention before public release.

| Store / category | Personal data | Default retention trigger | Disposal | Current evidence / owner |
| --- | --- | --- | --- | --- |
| `profiles` | Account user email, name, role, company id, auth provider, activity timestamps | Account closure, verified DSR, or legal retention review | Manual account deletion or anonymisation where retention applies | `docs/legal/DATA_SUBJECT_RIGHTS_PROCESS.md`, `docs/DATA_DELETION_WORKFLOW.md` |
| Supabase Auth | Auth user id, email, provider metadata, security/session metadata | Account closure or verified DSR | Admin deletion in Supabase Auth, subject to provider logs/backups | `docs/DATA_DELETION_WORKFLOW.md` |
| `companies` | Company name, billing/customer references | Account closure and legal/contract review | Delete after child data and legal holds are cleared | `docs/DATA_DELETION_WORKFLOW.md` |
| `company_user_invites` | Invite email, role, status, inviter, timestamps | Invite accepted, revoked, expired, account closure | Status update, expiry, or deletion during account closure | `app/(dashboard)/settings/team/actions.ts` |
| `employees` | Employee name, optional email, nationality type, deletion/anonymisation markers | Admin action, DSR, account closure, or retention policy | Soft delete, hard delete after 30-day recovery, or anonymise | `lib/gdpr/soft-delete.ts`, `lib/gdpr/anonymize.ts` |
| `trips` | Employee-linked travel dates, countries, purpose, job refs, private-trip flag | Company retention period or hard delete | Delete by retention job or FK cascade | `lib/gdpr/retention.ts` |
| `alerts` | Employee-linked alert state and message text | Employee anonymisation/deletion, account closure, or retention review | Scrub identifiers on anonymise; delete on hard delete/account deletion | `lib/gdpr/anonymize.ts`, `docs/DATA_DELETION_WORKFLOW.md` |
| `notification_log` | Recipient email, subject, provider id, status, errors | Employee anonymisation/deletion, account closure, or retention review | Scrub recipient/subject on anonymise/delete; delete during account closure | `lib/gdpr/anonymize.ts`, `lib/gdpr/soft-delete.ts` |
| `employee_compliance_snapshots` | Employee-linked compliance status and derived days | Hard delete, account closure, or retention review | Delete by cascade/account deletion | `lib/gdpr/dsar-export.ts`, migrations |
| `import_sessions` | File metadata, raw parsed rows, validation errors, import result payloads | Import completion/failure/abandonment and short stale window | Redact raw payloads via retention cleanup | `lib/gdpr/retention.ts` |
| `column_mappings` | User/company import mapping metadata | Account closure or explicit admin deletion | Delete during account closure | `docs/DATA_DELETION_WORKFLOW.md` |
| `audit_log` / GDPR audit | User id, action metadata, hash chain details | Audit retention period | Controlled purge with checkpoint; do not manually delete without legal review | `lib/gdpr/audit.ts`, retention migrations |
| `admin_audit_log` | Admin user ids, target ids, security metadata | Security/accountability retention review | Retain for audit/security; purge by approved policy | `docs/INCIDENT_RESPONSE.md` |
| `feedback_submissions` | Feedback/support content, contact data, page path | Ticket closure plus support retention period | Delete or anonymise through manual DSR process | `docs/legal/DATA_SUBJECT_RIGHTS_PROCESS.md` |
| Billing and Stripe metadata | Customer id, subscription/invoice/payment/refund/dispute records | Legal/tax retention period | Retain required records; delete customer/payment methods where allowed | `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md`, legal review required |
| Resend delivery metadata | Recipient email, delivery status, message metadata | Provider retention or verified support request | Provider purge/support request where available; app logs scrubbed where applicable | `docs/DATA_DELETION_WORKFLOW.md` |
| Sentry/Vercel/Supabase logs | Error/request metadata, possible identifiers | Provider/project retention settings | Minimize and expire by provider settings; manual search for DSR when feasible | `docs/legal/PROCESSOR_SUBPROCESSOR_REGISTER.md` |
| GA4/CookieYes | Cookie identifiers, events, consent preferences | Consent withdrawal, property retention settings, or DSR | Withdraw consent, delete where identifiable and available | `app/(public)/cookies/page.tsx` |
| Supabase Storage `gdpr-exports` | Generated DSAR ZIP archives | Export generation plus short availability window | Private object cleanup and short-lived signed URLs | `lib/gdpr/export-storage.ts`, `lib/gdpr/retention.ts` |
| Backups | Snapshot copies of all app data | Backup expiry window | Restore-only limitation; expire by provider backup policy | Backup/PITR evidence required before public launch |

## Open External Evidence

- [ ] Supabase backup/PITR retention and restore drill evidence.
- [ ] Provider retention settings captured for Sentry, Vercel, Resend, GA4,
  CookieYes, Cloudflare, and Upstash.
- [ ] Counsel confirms billing/tax retention periods.

