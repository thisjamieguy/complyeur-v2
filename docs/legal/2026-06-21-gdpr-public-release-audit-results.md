# GDPR Public Release Workplan — Audit Results

- **Audited by:** Claude (AI-assisted code audit)
- **Audit date:** 2026-06-21
- **Source checklist:** `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md` (last reviewed 2026-06-15)
- **Scope:** Every P0, P1, P2 item, plus the DSAR Coverage Map, Retention Schedule,
  Lawful Basis Matrix, Privacy Documentation Checklist, and DPIA/LIA triggers.

> This is not legal advice. It is an engineering evidence audit: each item was
> checked against the current codebase and supporting docs, and verified with the
> workplan's own minimum-verification test commands where applicable.

## Verification Runs Executed

| Command | Result |
| --- | --- |
| `pnpm test --run __tests__/unit/gdpr __tests__/unit/actions/gdpr-security.test.ts __tests__/unit/security/dsar-export-auth.test.ts` | **7 files / 14 tests passed** |
| `pnpm test --run __tests__/components/consent-aware-google-analytics.test.tsx __tests__/components/analytics-client.test.tsx` | **2 files / 7 tests passed** |

`pnpm typecheck` and `pnpm lint` were not re-run in this audit wave (no source
changes were made; this pass adds documentation only).

## Status Legend

- `Pass` — implemented in code and/or documented, with supporting evidence.
- `Partial` — core mechanism exists but the item's full intent is not yet met.
- `Gap` — not implemented or not documented in a verifiable artefact.

## Scorecard

| Tier | Pass | Partial | Gap |
| --- | --- | --- | --- |
| P0 Release Blockers | 1 | 3 | 0 |
| P1 Required | 2 | 4 | 1 |
| P2 Hardening | 0 | 4 | 2 |

**Release-readiness summary:** Core data-subject machinery (DSAR export, erasure,
anonymisation, retention purge, consent-gated analytics, breach plan) is built and
test-backed. The remaining work before claiming GDPR readiness publicly is largely
**documentation and account-level coverage**, not missing engineering: a finalised
Article 30 inventory, a standalone processor/sub-processor register (and two missing
processors on the public privacy page), a documented DSR operating process, and
retention rules for the stores not yet on the automated purge.

---

## P0 Release Blockers

### P0.1 — DSAR coverage complete for every personal-data store — `Partial`

**Covered in the export** (`lib/gdpr/dsar-export.ts`): `employees`, `trips`,
`alerts`, `notification_log`, `employee_compliance_snapshots`, and
`import_sessions` (`parsed_data`, `validation_errors`, `result`, matched per
employee). The export emits JSON + CSV per store, a README, and `metadata.json`
with a `data_scope` block. Verified by `__tests__/unit/gdpr/dsar-export-content.test.ts`
and access-control by `__tests__/unit/security/dsar-export-auth.test.ts` (pass).

**Not in the employee export** — documented in the workplan's DSAR Coverage Map as
"account-level / needs documented process": `profiles`, `notification_preferences`,
`feedback_submissions`, billing/Stripe metadata, Supabase Auth, app logs/Sentry,
and backups.

**Why Partial:** the workplan requires each store to be either *included* or
*explicitly excluded with rationale*, evidenced by tests. The employee-linked
stores meet that bar; the account-level stores are described as a manual process
but have no standalone documented exclusion rationale and no test proving the
exclusion. Close by adding a documented account-level DSR process (see P1.3) and a
manifest of excluded stores (see P2.5).

### P0.2 — Erasure and anonymisation remove duplicate personal data — `Pass`

`lib/gdpr/anonymize.ts` replaces `employees.name` with `ANON_<hash>`, nulls
`employees.email`, scrubs `alerts.message`, and scrubs `notification_log`
`recipient_email` + `subject` for the employee. `lib/gdpr/soft-delete.ts` scrubs
`notification_log` recipient/subject before the hard delete, then relies on FK
cascade for trips/alerts/snapshots. Soft delete vs hard delete are implemented and
described separately (30-day recovery window via `RECOVERY_PERIOD_DAYS`). Verified
by `anonymize-audit.test.ts` and `hard-delete-notification-redaction.test.ts` (pass).

**Note (does not block):** raw employee names embedded in un-purged
`import_sessions` payloads are removed by the retention redaction job (>1 day,
all statuses) rather than by `anonymizeEmployee` at the moment of anonymisation, so
a name can persist in staging data until the next purge cycle. Acceptable given the
short window, but worth stating in the retention/erasure documentation.

### P0.3 — Retention schedule covers all stores, not only trips — `Partial`

**Automated in `lib/gdpr/retention.ts` + `app/api/gdpr/cron/retention/route.ts`:**
expired trips (per-company `retention_months`), hard delete of employees past the
30-day soft-delete window, orphaned-employee purge, stale `import_sessions` payload
redaction across all statuses (pending → failed, >1 day), GDPR audit-log purge
(90 days), and DSAR export-archive cleanup. Cron is fail-closed via
`withCronAuth` (`CRON_SECRET` required; 401 on missing/invalid).

**Not yet automated / documented as policy:** `alerts`, `notification_log`
(currently only scrubbed on erase/anonymise, never time-purged), billing records,
auth/profile data, `feedback_submissions`, and backups (restore-only limitation is
acknowledged but not formalised). The workplan's own Retention Schedule table still
reads "to finalise" for these rows.

### P0.4 — Public privacy and cookie documents match implementation — `Partial`

**Strong:** `app/(public)/privacy/page.tsx` states a no-"use-means-consent" stance,
lists Article 6 lawful bases, declares London (UK) primary hosting with SCC reliance
for transfers, and documents retention/erasure tooling. `app/(public)/cookies/page.tsx`
documents CookieYes consent management, strictly-necessary cookies, and PECR/ePrivacy
basis. Analytics is consent-gated (`components/analytics/consent-aware-google-analytics.tsx`),
verified by `consent-aware-google-analytics.test.tsx` + `analytics-client.test.tsx` (pass).

**Gap driving Partial:** the privacy page "Service Providers" list names Supabase,
Stripe, Resend, Vercel, Google Analytics, and Sentry, but **omits CookieYes and
Cloudflare Turnstile**, both of which run in the app (`lib/cookieyes.ts`,
`components/ui/turnstile.tsx`, `lib/security/csp.ts`). The processor list must match
production services, so these two should be added before public release.

---

## P1 Required Before Public Release

### P1.1 — Lawful basis matrix exists and is reviewed — `Partial`

A matrix exists in the workplan ("Lawful Basis Matrix To Finalise") and a summarised
version is published on the privacy page (contract / legitimate interest / legal
obligation / consent). It is not yet a finalised, formally reviewed standalone
register, and special-category/children/criminal-offence "not processed" statements
live only in the workplan narrative.

### P1.2 — Article 30 processing inventory exists — `Gap`

No dedicated Article 30 Record of Processing Activities (ROPA) document was found in
`docs/`. The workplan describes the required fields but no inventory artefact (per
activity: purpose, data categories, data-subject categories, recipients, transfer
basis, retention, security controls, owner) has been produced.

### P1.3 — Data-subject-right operating process is documented — `Partial`

Tooling exists end-to-end (DSAR export, soft-delete, anonymise in
`app/(dashboard)/gdpr/`), and the export README explains rights under Articles
15/16/17/20/21. What is missing is the documented *operating process*: identity
verification, controller-vs-processor responsibility split, one-month deadline
tracking, extension handling, and a named escalation owner.

### P1.4 — Breach response flow is complete — `Pass`

`docs/INCIDENT_RESPONSE.md` includes a GDPR branch: a named Privacy Officer, the
72-hour Article 33 supervisory-authority decision point, ICO notification step,
a regulator-notice template, and a "GDPR Decision" section recording breach
suspicion, affected categories, and notification decisions. Meets the workplan's
stated evidence requirement.

### P1.5 — Processor/subprocessor register is current — `Partial`

No standalone register with the required columns (processing purpose, data
categories, region/transfer basis, DPA/SCC status, retention) exists. The privacy
page is the closest artefact but covers 6 of the expected processors, omits
CookieYes and Cloudflare Turnstile (see P0.4), and carries no DPA/SCC status.
A `docs/legal/DPA_TEMPLATE.md` exists (draft, for customer agreements) but is not a
sub-processor register.

### P1.6 — International transfer position is documented — `Partial`

The privacy page asserts London (UK) primary database hosting (consistent with
`CLAUDE.md`: prod = London) and SCC reliance for international transfers. Not yet
done: a per-processor transfer-basis mapping (which sub-processors transfer outside
the UK/EEA and under which safeguard), which belongs in the P1.5 register.

### P1.7 — Security measures listed in the policy are evidence-backed — `Pass`

MFA, RLS, tenant isolation, audit logging, secrets handling, and logging redaction
are implemented and cross-referenced in `docs/engineering/security-decisions.md` and
the penetration-test results (`docs/security/2026-02-19-pentest-checklist-results.md`).
Logging redaction is concretely present (notification scrub on erase/anonymise,
minimised GDPR audit details). TLS is provided by the Vercel/Supabase platform.

---

## P2 Hardening

### P2.1 — Cookie inventory from live production scan — `Gap`

No live-scan artefact attached to the cookie policy review was found.

### P2.2 — DPIA trigger checklist for future product changes — `Partial`

DPIA triggers are enumerated in the workplan's "DPIA / LIA Triggers" section, but
there is no standalone reusable DPIA checklist/template document.

### P2.3 — Legitimate Interest Assessment template — `Gap`

No LIA template document was found for security analytics, anti-abuse, or
non-essential operational processing.

### P2.4 — Privacy review added to the release checklist — `Partial`

The workplan's "Operating Rule" requires updating the register when new
personal-data fields/processors/exports/AI features land, but this gate is not yet
embedded in the primary release checklists (`docs/GO_LIVE_CHECKLIST.md`,
`docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`).

### P2.5 — DSAR export ZIP machine-readable manifest — `Partial`

`metadata.json` includes a `data_scope` block (per-store inclusion booleans and
record counts) but not a per-table, per-field manifest listing **excluded** stores
with rationale. Adding that manifest also helps close P0.1.

### P2.6 — Admin UI distinguishes soft delete / hard delete / anonymise — `Partial`

`app/(dashboard)/gdpr/gdpr-page-client.tsx` separates "Delete (30-day recovery
before permanent deletion)" from "Anonymization" and shows a "Deleted Employees
(Recovery)" section, so it does not imply immediate physical deletion. It does not
use the explicit "soft delete / hard delete" vocabulary or a note that anonymise is
irreversible-but-not-deletion; minor wording polish remains.

---

## DSAR Coverage Map — Audit

| Store | Workplan target status | Audited finding |
| --- | --- | --- |
| `employees` | Must verify | **Pass** — included; erased/anonymised |
| `trips` | Must verify | **Pass** — included; purged by retention; cascade on delete |
| `alerts` | Must verify | **Pass** — included; message scrubbed on anonymise |
| `notification_log` | Must verify | **Pass** — included; recipient/subject scrubbed on erase + anonymise |
| `employee_compliance_snapshots` | Must verify | **Pass** — included; cascade on hard delete |
| `import_sessions.parsed_data` | In progress | **Pass** — included (matched) + purged >1 day, all statuses |
| `import_sessions.validation_errors` | In progress | **Pass** — included (matched) + purged |
| `import_sessions.result` | In progress | **Pass** — included (matched) + sanitised on purge |
| `profiles` | Needs documented process | **Gap** — not in export, no documented process |
| `notification_preferences` | Needs documented process | **Gap** — not in export, no documented process |
| `feedback_submissions` | Needs documented process | **Gap** — not in export, no documented process |
| Billing/Stripe metadata | Needs documented process | **Gap** — processor-backed manual export undocumented |
| Supabase Auth | Needs documented process | **Gap** — undocumented manual process |
| App logs/Sentry | Needs documented process | **Gap** — undocumented |
| DSAR export archives | Must verify | **Pass** — private storage, expiry cleanup job exists |
| Backups | Needs documented limitation | **Gap** — restore-only limitation not formalised |

---

## Priority Recommendations (to reach release standard)

1. **P0** — Add CookieYes and Cloudflare Turnstile to the privacy page processor
   list so it matches production (`P0.4`).
2. **P0/P1** — Write the account-level DSR operating process covering `profiles`,
   `notification_preferences`, `feedback_submissions`, billing, Supabase Auth, and
   Sentry — with include/exclude rationale (`P0.1`, `P1.3`).
3. **P0** — Finalise retention rules (or documented manual process) for `alerts`,
   `notification_log`, billing, auth/profile, feedback, and backups (`P0.3`).
4. **P1** — Produce the Article 30 inventory and a standalone processor/sub-processor
   register with DPA/SCC status and per-processor transfer basis (`P1.2`, `P1.5`, `P1.6`).
5. **P2** — Add the DSAR manifest of excluded stores, a DPIA checklist, an LIA
   template, a production cookie scan, and a privacy gate in the release checklist.

## Already Strong (no action required for release)

- DSAR export for employee-linked stores, with audit logging and admin-only +
  tenant-scoped access control (test-backed).
- Erasure/anonymisation with cross-store identifier scrubbing (test-backed).
- Retention auto-purge with fail-closed cron authentication.
- Consent-gated analytics (no GA before consent; test-backed).
- Breach response plan with the GDPR 72-hour branch.
