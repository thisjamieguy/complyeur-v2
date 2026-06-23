# GDPR Public Release Workplan

Last reviewed: 2026-06-15

> **Audited:** A full item-by-item audit of this checklist (audited by Claude,
> 2026-06-21) lives in
> [`2026-06-21-gdpr-public-release-audit-results.md`](./2026-06-21-gdpr-public-release-audit-results.md).

Purpose: provide a practical, engineering-owned checklist for bringing
ComplyEur's GDPR and UK GDPR posture to public-release standard.

This is not legal advice. Treat it as an implementation and evidence map for
product, engineering, and counsel review.

## Release Standard

ComplyEur should not claim GDPR readiness publicly unless all P0 and P1 items
below are complete, tested, and supported by current documentation.

- P0: release blocker. High probability of personal-data exposure, inaccurate
  privacy claims, or incomplete data-subject-right handling.
- P1: required before broad public release. May be acceptable only with explicit
  documented operational workaround.
- P2: hardening, evidence, or operational maturity work.

## P0 Release Blockers

- [x] Employee DSAR coverage is complete for employee-linked app-owned stores.
  - Must include or explicitly exclude with rationale: `employees`, `trips`,
    `alerts`, `notification_log`, `employee_compliance_snapshots`,
    `import_sessions.parsed_data`, `import_sessions.validation_errors`,
    `import_sessions.result`, `profiles`, `notification_preferences`,
    `feedback_submissions`, billing/customer metadata, and support/contact data.
  - Evidence: DSAR unit tests prove each included store appears in the export or
    has a documented exclusion.
  - 2026-06-16 repo update: employee DSAR exports now include
    `dsar_manifest.json`, which documents included employee-linked stores and
    manual/excluded account, billing, auth, logs, archive, and backup stores.
    Account-level and processor-backed DSAR operations remain manual process
    items in `docs/legal/PRIVACY_OPERATING_RECORD.md`.

- [ ] Erasure and anonymisation remove or de-identify duplicate personal data.
  - Employee anonymisation must cover `employees.email` and any employee names
    embedded in alert messages, notification subjects, import history, and
    exported/reporting artefacts.
  - Soft-delete and hard-delete behavior must be documented separately.
  - Evidence: tests prove no raw employee name/email remains in app-owned tables
    after anonymisation, except where retention is explicitly documented.

- [ ] Retention schedule covers all stores, not only trips.
  - Add retention rules for import sessions, alert logs, notification logs,
    audit logs, DSAR generated archives, feedback/support submissions, billing
    records, auth/profile data, and backups.
  - Evidence: implementation or documented manual process exists for each row in
    the retention schedule.
  - 2026-06-15 repo update: stale import-session raw payload cleanup now covers
    pending, parsing, validating, ready, importing, completed, and failed states.
    This reduces abandoned/raw PII risk but does not close the full retention
    schedule until every store below has evidence.

- [x] Public privacy and cookie documents match the implementation at repo level.
  - Privacy policy must not rely on broad "use means consent" wording.
  - Cookie policy must reflect actual cookies/scripts and consent gating.
  - Processor list must match current production services.
  - Evidence: reviewed pages under `app/(public)/privacy` and
    `app/(public)/cookies`.
  - 2026-06-16 repo update: privacy policy processor list now includes
    CookieYes, Upstash Redis, and Cloudflare Turnstile where enabled, and backup
    wording no longer claims a fixed retention window before dashboard evidence.

## P1 Required Before Public Release

- [x] Lawful basis matrix exists.
  - Contract: account access, dashboard, compliance calculations, team use.
  - Legitimate interest: security logging, abuse prevention, reliability,
    operational diagnostics, limited compliance notifications where appropriate.
  - Legal obligation: tax/accounting/billing records where applicable.
  - Consent: analytics and non-essential cookies.
  - Explicitly record any special-category, children, or criminal-offence data as
    not intentionally processed.
  - Evidence: `docs/legal/PRIVACY_OPERATING_RECORD.md`.
  - Still required: legal/DPO review before public claims.

- [x] Article 30 processing inventory exists.
  - For each processing activity: purpose, data categories, data-subject
    categories, recipients/processors, transfer basis, retention, security
    controls, and system owner.
  - Evidence: `docs/legal/PRIVACY_OPERATING_RECORD.md`.
  - Still required: legal/DPO review before public claims.

- [x] Data-subject-right operating process is documented.
  - Access, rectification, erasure, restriction, portability, and objection.
  - Include identity verification, customer-controller versus ComplyEur-processor
    responsibilities, deadline tracking, and extension handling.
  - Target: one-month response clock, with documented escalation owner.
  - Evidence: `docs/legal/PRIVACY_OPERATING_RECORD.md`.

- [x] Breach response flow is complete.
  - Record discovery timestamp, affected data categories, affected subject count,
    likely consequences, containment/remediation, supervisory authority decision,
    and data-subject notification decision.
  - Include 72-hour Article 33 decision point.
  - Evidence: `docs/INCIDENT_RESPONSE.md` includes the GDPR branch.

- [x] Processor/subprocessor register exists.
  - Minimum expected entries: Supabase, Vercel, Stripe, Resend, Sentry, Google
    Analytics, CookieYes, Cloudflare Turnstile if enabled, and any support/email
    tooling that receives personal data.
  - Include processing purpose, data categories, region/transfer basis, DPA/SCC
    status, and retention notes.
  - Evidence: `docs/legal/PRIVACY_OPERATING_RECORD.md`.
  - 2026-06-16 repo update: `docs/legal/DPA_READINESS.md` now records the
    provider DPA/source links that were identified and the account-level evidence
    still required before public/paid launch.
  - Still required: account/provider dashboard evidence and legal/DPO signoff
    before public beta.

- [x] International transfer position is documented.
  - UK/EEA hosting claims must match deployed Supabase/Vercel configuration.
  - Non-UK/EEA processors require SCCs, adequacy, or other documented safeguard.
  - Evidence: `docs/legal/PRIVACY_OPERATING_RECORD.md`.
  - Still required: production dashboard evidence for hosting region and provider safeguards.

- [x] Security measures listed in the policy are evidence-backed at repo level.
  - MFA, RLS, tenant isolation, TLS, audit logging, secrets handling, dependency
    checks, logging redaction, and incident response should link to current docs
    or tests.
  - Evidence: `docs/legal/PRIVACY_OPERATING_RECORD.md`.

## P2 Hardening

- [ ] Cookie inventory is generated from a live production scan and attached to
  the cookie policy review.
- [x] DPIA trigger checklist exists for future product changes.
- [x] Legitimate Interest Assessment trigger list exists for security analytics,
  anti-abuse, and non-essential operational processing.
- [ ] Privacy review is added to release checklist for new processors, new
  personal-data fields, new exports, and new AI/automation features.
- [x] DSAR export ZIP includes a machine-readable manifest listing tables,
  fields, and excluded stores with rationale.
- [ ] Admin UI labels distinguish "soft delete", "hard delete", and
  "anonymise" without implying immediate physical deletion where not true.

## DSAR Coverage Map

| Store | Personal data | Current handling target | Release status |
| --- | --- | --- | --- |
| `employees` | Name, email, nationality type, deletion/anonymisation markers | Include in DSAR; erase/anonymise | Must verify |
| `trips` | Travel dates, countries, purpose, job ref, private-trip flag | Include in DSAR; purge by retention; delete on hard delete | Must verify |
| `alerts` | Employee-linked compliance status and message text | Include in DSAR; scrub embedded identifiers on anonymisation | Must verify |
| `notification_log` | Recipient email, subject, delivery status, provider id | Include in DSAR; scrub embedded identifiers where possible | Must verify |
| `employee_compliance_snapshots` | Employee-linked compliance status | Include in DSAR; delete on hard delete | Must verify |
| `import_sessions.parsed_data` | Raw imported names, emails, trip rows | Include in DSAR or purge after import | In progress; stale-session cleanup broadened 2026-06-15 |
| `import_sessions.validation_errors` | Raw invalid values, names, emails | Include in DSAR or purge after import | In progress; stale-session cleanup broadened 2026-06-15 |
| `import_sessions.result` | Import result/errors; may contain row-level values | Include in DSAR or sanitize before storage | In progress; stale-session cleanup broadened 2026-06-15 |
| `profiles` | User email, name, company, role, auth metadata | Account-level DSAR/manual process | Needs documented process |
| `notification_preferences` | User email preference state and unsubscribe token | Account-level DSAR/manual process | Needs documented process |
| `feedback_submissions` | User feedback and page path | Account-level DSAR/manual process | Needs documented process |
| Billing/Stripe metadata | Customer, subscription, invoices, tax records | Manual processor-backed export; legal retention | Needs documented process |
| Supabase Auth | User identifiers, email, session/auth metadata | Manual processor-backed export/deletion | Needs documented process |
| App logs/Sentry | Error context, request metadata, possible user ids | Minimize/redact; include where searchable | Needs documented process |
| DSAR export archives | Generated ZIP containing personal data | Private storage; short signed URL; purge quickly | Must verify |
| Backups | Database snapshots containing all stored data | Restore-only; expire per backup policy | Needs documented limitation |

## Retention Schedule To Finalise

| Data category | Default retention | Trigger | Disposal | Notes |
| --- | --- | --- | --- | --- |
| Active account/profile data | Account lifetime | Account closure or verified DSR | Delete/anonymise unless legal basis remains | Separate controller/processor responsibilities |
| Employee records | Company configured period or active employment need | DSR/admin action/inactivity | Soft delete, hard delete, or anonymise | 30-day recovery must be explicit |
| Trip records | Company configured retention period | `exit_date` older than policy | Delete | Must account for legal/employment retention needs |
| Import raw data | Short operational window | Import completed/failed/abandoned | Purge or sanitize | Code now includes pending, parsing, validating, ready, importing, completed, and failed stale-session states |
| Alerts | Defined operational period | Alert resolved or employee anonymised/deleted | Delete or scrub identifiers | Message text can contain names |
| Notification logs | Defined operational/legal period | Sent/failed timestamp | Delete or scrub identifiers | Recipient email is personal data |
| GDPR audit log | Defined audit period | Audit retention job | Controlled purge with hash checkpoint | Keep accountability without indefinite PII |
| Billing records | Legal/tax period | Invoice/subscription event | Retain then delete | Confirm UK tax/accounting requirements with counsel |
| Feedback/support | Defined support period | Ticket/feedback closed | Delete or anonymise | Check support tooling too |
| DSAR export archives | 24 hours or less | Export generated | Delete object | Signed URLs should be short-lived |
| Backups | Published backup window | Backup creation | Automatic expiry | Document restore-only deletion limitation |

## Lawful Basis Matrix To Finalise

| Processing activity | Data categories | Likely basis | Notes |
| --- | --- | --- | --- |
| Account registration/authentication | Email, name, auth metadata | Contract | Needed to provide the service |
| Company/team administration | User profile, role, company membership | Contract | Include team invite flow |
| Employee travel compliance tracking | Employee name/email, nationality type, trip data | Contract / legitimate interest | Customer may be controller; ComplyEur often processor |
| Compliance alerts | Employee compliance state, recipient emails | Contract / legitimate interest | Avoid over-sharing employee details in email |
| Billing | Customer, subscription, invoice, payment metadata | Contract / legal obligation | Stripe is independent processor/controller depending context |
| Security and audit logs | User id, IP/request metadata, actions | Legitimate interest / legal obligation | Minimize and redact sensitive values |
| Product analytics | Cookie/device analytics | Consent | Must be blocked until consent |
| Support/feedback | Contact details, message content | Contract / legitimate interest | Limit retention and access |
| Marketing/waitlist | Email, company, source | Consent / legitimate interest depending flow | Ensure opt-out and transparency |

## Privacy Documentation Checklist

- [ ] Controller/processor roles are clearly explained.
- [ ] Data-subject categories include customer users and customer-managed
  employees/travellers.
- [ ] Data categories match the schema and imports, including employee emails,
  nationality type, trip purpose, job refs, private trip flag, and notification
  logs.
- [ ] Purposes match actual product behavior.
- [ ] Legal bases are specific per purpose.
- [ ] Processor list is current.
- [ ] International transfers and safeguards are specific.
- [ ] Retention periods are concrete or tied to clear criteria.
- [ ] Rights process includes contact, identity verification, deadline, and
  customer-controller escalation.
- [ ] Cookie consent can be changed after initial choice.
- [ ] Analytics is not loaded before consent.
- [ ] Breach notification language is accurate and operationally supported.

## DPIA / LIA Triggers

Run a DPIA review before shipping any change that introduces:

- Automated decision-making or profiling that materially affects individuals.
- Large-scale new personal-data processing.
- New special-category, criminal-offence, or children's data.
- New monitoring, scoring, risk ranking, or predictive analytics beyond the
  current Schengen compliance calculation.
- New AI feature using customer or employee data.
- New processor or international transfer with elevated risk.

Run a Legitimate Interest Assessment before relying on legitimate interest for:

- Security monitoring beyond ordinary access/audit logs.
- Product analytics that is not consent-based.
- Anti-abuse/fraud detection.
- Compliance notification content that includes employee-level details.
- Reuse of operational data for product improvement.

## Suggested Evidence Links

Keep these current as implementation changes:

- GDPR tools: `app/(dashboard)/gdpr/`
- DSAR export: `lib/gdpr/dsar-export.ts`
- Erasure/anonymisation: `lib/gdpr/soft-delete.ts`, `lib/gdpr/anonymize.ts`
- Retention: `lib/gdpr/retention.ts`, `app/api/gdpr/cron/retention/route.ts`
- Audit log: `lib/gdpr/audit.ts`
- Consent-gated analytics: `components/analytics/consent-aware-google-analytics.tsx`
- Cookie types: `lib/cookieyes.ts`, `lib/analytics/consent.ts`
- Public privacy pages: `app/(public)/privacy/`, `app/(public)/cookies/`
- Security decisions: `docs/engineering/security-decisions.md`
- Incident response: `docs/INCIDENT_RESPONSE.md`
- DPA template: `docs/legal/DPA_TEMPLATE.md`
- DPA readiness and subprocessor evidence tracker:
  `docs/legal/DPA_READINESS.md`

## Minimum Verification Before Marking Complete

Run the smallest relevant checks after implementation changes:

```bash
pnpm test __tests__/unit/gdpr __tests__/unit/actions/gdpr-security.test.ts __tests__/unit/security/dsar-export-auth.test.ts
pnpm test __tests__/components/consent-aware-google-analytics.test.tsx __tests__/components/analytics-client.test.tsx
pnpm typecheck
pnpm lint
```

For release evidence, also perform a live local or staging probe for:

- Owner/admin can generate own-company DSAR export.
- Non-admin cannot generate DSAR export.
- Cross-tenant employee ID returns non-disclosing denial.
- Anonymised employee no longer exposes raw employee name/email in app-owned
  employee-linked stores.
- Retention cron rejects missing/invalid secret and succeeds with valid secret.
- Cookie banner reject path prevents GA cookies/scripts/events.
- Abandoned and completed import sessions no longer retain raw parsed data,
  validation errors, or row-level result payloads beyond the approved window.

## Operating Rule

When a new personal-data field, table, processor, export, email, import format,
or AI/automation feature is added, update this workplan or the finalized GDPR
register in the same pull request.
