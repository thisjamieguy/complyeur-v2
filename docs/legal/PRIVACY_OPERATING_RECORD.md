# Privacy Operating Record

Last reviewed: 2026-06-16

Status: implementation record pending legal/DPO review before public claims.

This record consolidates ComplyEur's GDPR/UK GDPR operating evidence for public
beta. It is not legal advice and does not replace counsel review.

## Roles

ComplyEur usually acts as a processor for customer-managed employee/traveller
data entered into the compliance workspace. Customers usually act as controller
for that employee travel data.

ComplyEur acts as controller for its own account, billing, security, support,
marketing, and operational records.

## Lawful Basis Matrix

| Processing activity | Data categories | Likely basis | Notes |
| --- | --- | --- | --- |
| Account registration and authentication | User email, name, auth identifiers, MFA state, session metadata | Contract | Required to provide account access and secure the service. |
| Company and team administration | User profile, company membership, role, invites, ownership changes | Contract | Supports customer workspace administration and access control. |
| Employee travel compliance tracking | Employee name, email where provided, nationality type, trip dates, countries, trip purpose, job reference, private-trip flag | Contract / legitimate interests | Customer-managed employee data; customer determines the underlying employment/immigration compliance purpose. |
| Compliance calculations and alerts | Employee compliance state, alert messages, notification recipients, acknowledgement metadata | Contract / legitimate interests | Necessary to deliver the core product and warn customers about travel-risk states. |
| Imports and validation | Uploaded employee/trip rows, validation errors, import result summaries | Contract | Used to import customer-provided data; raw/stale import payloads are minimized by retention cleanup. |
| Exports and reports | Employee/trip/compliance data selected by customer users | Contract | Generated at customer request for business compliance workflows. |
| Billing | Customer, subscription, invoice, payment status, Stripe identifiers | Contract / legal obligation | Payment-card details are handled by Stripe. Billing records may be retained for tax/accounting requirements. |
| Security, audit, and abuse prevention | User id, company id, request metadata, audit events, rate-limit signals | Legitimate interests / legal obligation | Needed to secure tenant isolation, detect abuse, and evidence administrative actions. |
| Error monitoring and reliability | Error context, route names, limited identifiers where needed for debugging | Legitimate interests | Sentry session replay is disabled; do not intentionally send raw employee travel data to monitoring. |
| Product analytics and non-essential cookies | Cookie/device identifiers, usage events, page views | Consent | Google Analytics runs only after analytics consent. |
| Support and beta feedback | Contact details, account context, free-text feedback, page path | Contract / legitimate interests | Used to answer support requests and triage beta feedback. |
| Marketing/waitlist | Email, company, role/source where provided | Consent / legitimate interests | Use opt-out where direct marketing is sent. |

## Article 30 Processing Inventory

| Activity | Purpose | Data subjects | Recipients/processors | Transfer position | Retention | System owner |
| --- | --- | --- | --- | --- | --- | --- |
| SaaS account access | Register, authenticate, and authorize users | Customer users | Supabase, Vercel | UK/EEA or processor safeguards depending provider region | Account lifetime plus operational/legal retention | Engineering owner |
| Travel compliance workspace | Track employee Schengen usage and risk | Customer-managed employees/travellers, customer users | Supabase, Vercel | Primary database intended for London/UK hosting; verify dashboard evidence before public beta | Customer retention setting; default 36 months for trip retention | Product/Engineering owner |
| Compliance alerts | Send risk notifications | Employees/travellers named in alerts, customer users receiving email | Resend, Supabase, Vercel | Processor safeguards required for email delivery | Notification log retained per published retention schedule; employee anonymisation scrubs direct identifiers | Product/Support owner |
| Import processing | Parse and validate customer uploads | Customer-managed employees/travellers | Supabase, Vercel | Same as app/database hosting | Raw payloads redacted after operational window by retention job | Engineering owner |
| Billing | Create checkout, subscriptions, invoices, and entitlement state | Customer billing contacts/users | Stripe, Supabase, Vercel | Stripe safeguards/DPA required; retain legal/tax records as required | Legal/tax period, confirmed with counsel | Billing owner |
| Support and feedback | Handle support requests and beta feedback | Customer users, any named people in free text | Email/support tooling, Supabase, Vercel | Processor safeguards required | Defined support retention period; delete/anonymise after closure where appropriate | Support owner |
| Security and audit | Protect tenant isolation, investigate incidents, evidence admin/GDPR actions | Customer users, indirectly affected employee records | Supabase, Vercel, Sentry, Upstash where configured | Processor safeguards required | Audit/security retention per security and GDPR records | Security owner |
| Analytics and cookies | Understand public-site usage and campaign performance | Website visitors and users who consent | Google Analytics, CookieYes | Processor safeguards/Google transfer basis required | Per cookie policy and GA settings | Growth/analytics owner |

## Data-Subject-Right Operating Process

1. Intake: receive request through `privacy@complyeur.com`, support, or the customer administrator.
2. Classify role: decide whether the request concerns a customer user, customer-managed employee/traveller, billing contact, support contact, or website visitor.
3. Verify identity: confirm requester identity and authority. For customer-managed employee data, coordinate with the customer controller unless ComplyEur is legally required to act directly.
4. Scope systems: use the DSAR manifest in employee exports plus this record to decide which app, auth, billing, support, monitoring, and backup stores apply.
5. Execute:
   - Employee access requests: use the in-app GDPR DSAR export where the customer administrator is authorized.
   - Employee erasure requests: use soft delete, hard delete, or anonymisation according to customer instruction and retention basis.
   - Account/billing/support requests: handle manually across Supabase Auth, `profiles`, notification preferences, feedback/support records, Stripe, and relevant logs.
6. Track deadlines: one-month response clock from verified receipt; record any extension rationale and notify the requester.
7. Record decision: store request type, scope, action taken, exclusions/retention rationale, owner, dates, and evidence.
8. Close: provide response securely and confirm follow-up actions such as deletion after recovery windows.

## DSAR And Erasure Coverage

| Store | Current handling |
| --- | --- |
| `employees` | Included in employee DSAR export; direct identifiers anonymised or deleted through GDPR tools. |
| `trips` | Included in employee DSAR export; purged by retention and deleted on hard employee deletion. |
| `alerts` | Included in employee DSAR export; message text scrubbed on anonymisation. |
| `notification_log` | Included in employee DSAR export; recipient/subject scrubbed on anonymisation and hard deletion. |
| `employee_compliance_snapshots` | Included in employee DSAR export; employee-linked records deleted with employee where database cascade applies. |
| `import_sessions` | Matching retained rows/errors included in employee DSAR export; raw/stale payloads redacted by retention cleanup. |
| `profiles` | Account-level manual DSAR/deletion process. |
| `notification_preferences` | Account-level manual DSAR/deletion process; unsubscribe token treated as personal data. |
| `feedback_submissions` | Manual support/privacy process because free text may contain arbitrary personal data. |
| Billing/Stripe | Manual processor-backed export/deletion review; retain tax/accounting data where required. |
| Supabase Auth | Manual account-level export/deletion review. |
| App logs/Sentry | Manual search/minimisation where feasible; operational logs are not employee-keyed. |
| DSAR export archives | Short-lived private archive copies; cleanup handled by retention code. |
| Backups | Restore-only operational copies with expiry; selective deletion is not applied inside existing backups. |

## Retention Schedule

| Category | Default retention | Trigger | Disposal |
| --- | --- | --- | --- |
| Active account/profile data | Account lifetime | Account closure or verified DSR | Delete/anonymise unless legal basis remains. |
| Employee records | Customer-configured retention or active business need | DSR/admin action/inactivity | Soft delete, hard delete, or anonymise. |
| Trip records | Company retention setting, default 36 months | Exit date older than retention policy | Delete by retention job. |
| Import raw payloads | Short operational window | Import completed, failed, stale, or abandoned | Redact parsed data and validation payloads. |
| Alerts | Defined operational period | Alert resolved, employee anonymised/deleted, or retention review | Delete or scrub direct identifiers. |
| Notification logs | Defined operational/legal period | Sent/failed timestamp, employee anonymised/deleted, or retention review | Delete or scrub direct identifiers. |
| GDPR audit log | 90 days for purge helper unless operational policy extends it | Audit retention job | Controlled purge with audit checkpoint. |
| Billing records | Legal/tax period | Invoice/subscription lifecycle and legal retention expiry | Retain then delete through billing process. |
| Feedback/support | Defined support period | Ticket/feedback closed and retention period elapsed | Delete or anonymise. |
| DSAR export archives | Short signed-URL lifetime | Export generated | Delete from private storage. |
| Backups | Provider backup window | Backup creation | Automatic expiry; restore-only limitation documented. |

## Processor/Subprocessor Register

DPA/SCC source links, account-evidence requirements, and signoff status are
tracked in `docs/legal/DPA_READINESS.md`.

| Processor | Purpose | Data categories | Region/transfer position | DPA/SCC status | Retention notes |
| --- | --- | --- | --- | --- | --- |
| Supabase | Database, Auth, storage | Account, employee, trip, auth, DSAR export archive data | Production database intended for London/UK; dashboard evidence required | Public DPA page identified; account legal-doc and hosting-region evidence still required | Database retention and backup/PITR policy must be evidenced. |
| Vercel | Hosting, deployment, edge/runtime logs | Request metadata, operational logs, app traffic | Region depends on Vercel runtime/log processing | Public DPA/SCC terms identified; account/project evidence still required | Logs per Vercel settings. |
| Stripe | Checkout, subscription, invoices | Billing contacts, customer/subscription ids, invoices, payment metadata | Stripe processing regions and safeguards | Public DPA identified; live account acceptance/settings evidence still required | Legal/tax retention may apply. |
| Resend | Transactional email | Recipient emails, subjects, notification content | Provider safeguards required | Public DPA/subprocessor terms identified; account evidence still required | Retention per Resend logs/settings. |
| Sentry | Error monitoring | Error context, route metadata, limited user ids | Provider safeguards required | Public DPA identified; organization settings and session-replay-disabled evidence required | Retain only needed debugging window. |
| Google Analytics | Consent-gated analytics | Cookie/device identifiers, page events | Google transfer safeguards | Public data-processing terms path identified; GA account acceptance, consent mode, and retention evidence required | Per GA retention settings and cookie policy. |
| CookieYes | Consent management | Consent preferences and cookie banner state | Provider safeguards required | Public processor-policy reference identified; DPA/subprocessor evidence still required from account/support | Consent cookie retained per cookie policy. |
| Upstash Redis | Rate limiting / abuse prevention | Request/rate-limit keys, IP-derived or user-derived keys where configured | Provider safeguards required | Public trust center found; DPA/SCC evidence not yet confirmed from public text | Retain short-lived rate-limit keys only. |
| Cloudflare Turnstile | Bot protection where enabled | Challenge/token and request metadata | Cloudflare safeguards | Public DPA identified; production enablement/settings evidence required if used | Per Cloudflare settings. |
| Email/support tooling | Support routing and privacy requests | Contact details, support messages | Tool-specific safeguards | Confirm exact tooling before public beta | Retain per support policy. |

## International Transfer Position

- Primary database hosting is intended to be London/UK; this must be confirmed with Supabase production dashboard evidence before public beta.
- Supporting processors may process limited data outside the UK/EEA. Public beta requires current DPA/SCC or adequacy evidence for each active processor above.
- Public privacy wording should remain conditional on verified provider evidence and must not claim exclusive UK/EEA processing.

## Evidence-Backed Security Measures

| Measure | Evidence |
| --- | --- |
| Tenant isolation and RLS | `docs/engineering/adr/ADR-001-multi-tenant-rls-strategy.md`, `docs/security/rls-audit/03-rls-audit-report.md`, `__tests__/security/multi-tenancy.test.ts`, `e2e/multi-user-isolation.spec.ts` |
| Auth and role enforcement | `lib/security/authorization.ts`, `__tests__/unit/security/authorization-mutation.test.ts`, `__tests__/unit/security/mfa-role-enforcement.test.ts` |
| Service-role boundary | `lib/supabase/admin.ts`, `__tests__/unit/security/service-role-allowlist.test.ts` |
| CRON authentication | `lib/security/cron-auth.ts`, `__tests__/unit/security/cron-auth.test.ts` |
| GDPR export and storage | `lib/gdpr/dsar-export.ts`, `lib/gdpr/export-storage.ts`, `__tests__/unit/gdpr/dsar-export-content.test.ts`, `__tests__/unit/gdpr/export-storage.test.ts` |
| Erasure/anonymisation | `lib/gdpr/anonymize.ts`, `lib/gdpr/soft-delete.ts`, `__tests__/unit/gdpr/anonymize-audit.test.ts`, `__tests__/unit/gdpr/hard-delete-notification-redaction.test.ts` |
| Retention cleanup | `lib/gdpr/retention.ts`, `app/api/gdpr/cron/retention/route.ts`, `__tests__/unit/gdpr/audit-retention.test.ts` |
| Consent-gated analytics | `components/analytics/consent-aware-google-analytics.tsx`, `lib/analytics/consent.ts`, `__tests__/components/consent-aware-google-analytics.test.tsx`, `__tests__/components/analytics-client.test.tsx` |
| Incident response | `docs/INCIDENT_RESPONSE.md` |
| Dependency/security audit | `.github/workflows/security.yml`, `pnpm security:check` evidence |

## DPIA Triggers

Run a DPIA review before shipping any change that introduces automated
decision-making with material effects, large-scale new personal-data processing,
special-category/criminal-offence/children's data, new AI over customer data, new
monitoring/scoring beyond Schengen compliance calculations, or a new high-risk
processor/transfer.

## Legitimate Interest Assessment Triggers

Run an LIA before relying on legitimate interest for security monitoring beyond
ordinary logs, non-consent analytics, anti-abuse/fraud detection, employee-level
notification content beyond the service contract, or reuse of operational data
for product improvement.

## Public Beta Review Requirements

- Legal/DPO review of this record, `docs/legal/DPA_TEMPLATE.md`, and
  `docs/legal/DPA_READINESS.md`.
- Dashboard evidence for processor configuration, data residency, DNS/email
  authentication, backups/PITR, and monitoring.
- Evidence note for one completed DSAR export, one anonymisation, one retention
  cron protected-run, and one cookie reject path probe in staging or production.
