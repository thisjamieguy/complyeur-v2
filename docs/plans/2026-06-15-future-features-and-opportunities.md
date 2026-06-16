# Future Features And Opportunities

**Date:** 2026-06-15
**Status:** Planning reference
**Scope:** Future product opportunities for ComplyEur after the core Schengen
90/180-day product
**Source basis:** Founder-proposed feature list, repository context, and external
research summary. Validate regulatory details against primary sources before
implementation.

---

## Summary

ComplyEur's strongest product direction is:

```text
Schengen tracker
  -> pre-travel approval system
  -> travel compliance evidence platform
  -> A1 / posted-worker expansion
```

The next feature set should stay close to existing employee, trip, company,
alert, import/export, calendar, and audit-log infrastructure. The product should
avoid jumping too early into full tax-advice, global visa, or permanent
establishment engines without specialist content partners.

---

## Product Principles

1. **Prevent risk before travel is booked.** The product should move from
   passive tracking to pre-travel checks, approvals, and evidence.
2. **Use trip data as the core asset.** Most future modules should reuse the
   same employee, trip, country, document, alert, and audit-log data.
3. **Separate calculations from advice.** ComplyEur can flag risk and produce
   evidence, but legal, tax, immigration, and social-security conclusions need
   careful disclaimers and source validation.
4. **Build visible workflows before generic platforms.** A rules engine is
   strategically important, but it should emerge from approval, document, A1,
   posted-worker, and reporting workflows.
5. **Prefer Europe-first depth over global breadth.** UK/EU employer problems
   are the strongest near-term market. Global expansion should follow traction,
   not precede it.

---

## Recommended Roadmap

### Phase 1: Compliance Reporting And Pre-Trip Controls

**Timeframe:** Next 0-6 months after MVP stabilization

| Priority | Feature | Rating | Build posture |
|----------|---------|--------|---------------|
| 1 | Pre-Travel Compliance Approval Workflow | 9.5/10 | Build soon |
| 2 | Time in Country Reports | 9/10 | Build soon |
| 3 | Employee Self-Service Data Capture | 9/10 | Build soon |
| 4 | Passport Validity Checker | 8.5/10 | Build soon |
| 5 | Travel Document Hub | 8/10 | Build soon |
| 6 | Renewal And Expiry Command Center | 8/10 | Build soon |
| 7 | Travel Booking Request Intake Form | 7.5/10 | Build with approvals |

**Goal:** Make ComplyEur the place where travel is requested, checked, approved,
documented, and reported before risk is created.

### Phase 2: A1, Posted Worker, And Evidence Platform

**Timeframe:** 6-12 months after Phase 1

| Priority | Feature | Rating | Build posture |
|----------|---------|--------|---------------|
| 1 | A1 Certificate / EU Social Security Tracking | 8.5/10 | Next major compliance module |
| 2 | Posted Worker Notification Tracker | 8.5/10 | Pair with A1 |
| 3 | Compliance Evidence Pack / Audit Binder | 8.5/10 | Paid feature |
| 4 | Company Travel Policy Rules Engine | 7.5/10 | Build after approvals |
| 5 | Lightweight Multi-Country Rules Engine | 8/10 | Internal platform |
| 6 | Project-Based Compliance Views | 8/10 | Strong differentiator |
| 7 | Workation / Remote-Work Approval Flow | 9/10 | Strong add-on |

**Goal:** Expand from Schengen day-counting into employer compliance workflows
for European social-security, posting, workation, and audit evidence.

### Phase 3: Advanced Risk, Integrations, And Enterprise Readiness

**Timeframe:** 12-24 months after Phase 1

| Priority | Feature | Rating | Build posture |
|----------|---------|--------|---------------|
| 1 | Duty of Care / High-Risk Destination Layer | 7.5/10 | Build after trip workflows |
| 2 | EES Awareness And Integration Layer | 7.5/10 | Content first |
| 3 | ETIAS Preparation Module | 7.5/10 | Build close to enforcement |
| 4 | Data Quality And Reconciliation Center | 7.5/10 | Build after integrations |
| 5 | API And Webhooks | 8/10 | Build for partners and larger customers |
| 6 | Third-Party Integrations | 7/10 | Progressive rollout |
| 7 | SSO / SCIM / Enterprise Security Pack | 7.5/10 | Build when moving up-market |

**Goal:** Increase defensibility, partner readiness, and enterprise fit without
turning the product into a broad, high-liability global compliance system too
early.

---

## Feature Specs

### 1. Pre-Travel Compliance Approval Workflow

**Problem:** Companies often discover Schengen risk after a trip has already
been planned or booked.

**Primary users:** HR, mobility managers, line managers, travel managers,
operations.

**MVP scope:**

- Create a travel request before booking.
- Run Schengen 90/180 and passport checks against the proposed trip.
- Assign approval status: draft, submitted, approved, rejected, needs changes,
  cancelled.
- Capture approver, decision timestamp, reason, and exception notes.
- Convert approved request into a trip.
- Preserve approval history in the audit log.

**Later scope:**

- Multi-step approval routing.
- Policy-based auto-approval or escalation.
- Slack / Teams notifications.
- Integration with travel booking tools.

**Data needs:** Travel request, requested dates, destination countries,
requester, employee, approver, status history, risk result snapshot, exception
reason.

**Risks:** Approval records become compliance evidence. Audit history must be
accurate and tenant-isolated.

---

### 2. Time In Country Reports

**Problem:** Employers need country-level day counts for tax, immigration,
insurance, social-security, and internal travel reviews.

**Primary users:** HR, finance, tax, mobility, operations.

**MVP scope:**

- Days by country per employee.
- Period filters: month, quarter, calendar year, fiscal year, custom range.
- Consecutive day totals and total days.
- CSV and PDF export.
- "No travel in period" handling.

**Later scope:**

- Client/project filters.
- UK fiscal-year presets.
- Country risk bands.
- Scheduled reports.

**Data needs:** Existing trip data, country codes, employee, company, date
range, optional project/client reference.

**Risks:** Reports should state that they are factual day-count records, not
tax determinations.

---

### 3. Employee Self-Service Data Capture

**Problem:** HR cannot scale if every trip, passport date, document, and
correction has to be entered centrally.

**Primary users:** Employees, HR admins, managers.

**MVP scope:**

- Employee profile link or authenticated employee portal.
- Employee can review and submit planned travel.
- Employee can update passport issue and expiry dates.
- Employee can upload travel documents.
- HR can approve or reject submitted changes.
- Full audit trail for employee-submitted data.

**Later scope:**

- Employee attestations.
- Annual travel compliance questionnaire.
- Mobile-friendly document capture.
- Delegate access for executive assistants.

**Data needs:** Employee portal access model, pending profile changes, document
metadata, approval status, audit events.

**Risks:** Access control must prevent cross-employee and cross-tenant data
exposure. Uploaded documents may contain sensitive personal data.

---

### 4. Passport Validity Checker

**Problem:** UK and other non-EU travellers can be denied boarding or entry if
passport validity rules are not met.

**Primary users:** HR, travel managers, employees.

**MVP scope:**

- Store passport issue and expiry dates.
- Check proposed Schengen trips against issue-age and post-departure validity
  rules.
- Flag employees expiring within configurable windows.
- Show passport status in employee profile, dashboard, and travel request.

**Later scope:**

- Nationality-specific rule variants.
- Multiple passports per employee.
- Renewal task workflow.

**Data needs:** Passport issue date, expiry date, issuing country, nationality,
trip end date.

**Risks:** Passport rules change and can vary by nationality. Validate against
official government and EU sources before implementation.

---

### 5. Travel Document Hub

**Problem:** Travel compliance documents are scattered across email, HRIS,
shared drives, and advisory records.

**Primary users:** HR, mobility, employees, external advisors.

**MVP scope:**

- Document records linked to employees and optional trips.
- Document types: passport, visa, residence permit, A1 certificate, ETIAS
  confirmation, posted-worker notification, other.
- Expiry date and issuing country fields.
- Access-controlled upload, download, and deletion.
- Document expiry alerts.

**Later scope:**

- OCR-assisted metadata extraction.
- Document completeness checks.
- Advisor upload/review access.

**Data needs:** Document metadata, storage path, employee, company, document
type, expiry date, issuing country, verification status.

**Risks:** Strong data protection controls are required. Do not store documents
unless retention, deletion, and access policies are clear.

---

### 6. Renewal And Expiry Command Center

**Problem:** HR needs one operational queue for documents and authorisations
that are expired or approaching expiry.

**Primary users:** HR, mobility, operations.

**MVP scope:**

- Unified expiry dashboard across passports and stored travel documents.
- Filters by employee, document type, country, expiry window, and status.
- Email reminders to HR and employees.
- Bulk export of renewal queue.

**Later scope:**

- Renewal tasks and ownership.
- SLA tracking.
- Auto-reminder cadence.

**Data needs:** Document expiry dates, employee owner, reminder status, task
status.

**Risks:** Reminders should avoid exposing sensitive document details in email.

---

### 7. A1 Certificate / EU Social Security Tracking

**Problem:** Employers sending workers into EEA countries or Switzerland may
need A1 certificates or equivalent social-security evidence.

**Primary users:** HR, payroll, mobility, legal.

**MVP scope:**

- Track A1 status per employee and trip: not needed, may be needed, requested,
  issued, expired, unknown.
- Store certificate reference, issuing country, valid-from, valid-to.
- Alert when a planned trip may need review.
- Include A1 status in travel approvals and evidence packs.

**Later scope:**

- Country-specific guidance.
- Integration or handoff to A1 filing providers.
- Equivalent certificate tracking for non-EU bilateral agreements.

**Data needs:** Home social-security country, host country, employment entity,
trip dates, certificate metadata, document upload.

**Risks:** A1 rules are complex and country-specific. MVP should use cautious
"may require review" language, not definitive legal conclusions.

---

### 8. Posted Worker Notification Tracker

**Problem:** EU posted-worker rules can require host-country notifications and
document retention before work starts.

**Primary users:** HR, legal, mobility, operations.

**MVP scope:**

- Flag trips that may be postings rather than ordinary business travel.
- Store notification status: not assessed, not required, required, submitted,
  confirmed, expired.
- Track host country, work location, start/end, reference number, and coverage
  period.
- Include notification state in pre-travel approval and evidence packs.

**Later scope:**

- Country-by-country requirement library.
- EU eDeclaration workflow if available and appropriate.
- Local representative/contact fields.

**Data needs:** Work purpose, host country, project/client, work location,
employee role, employer entity, notification reference.

**Risks:** High regulatory variability. Avoid automated filing until rules,
liability, and partner options are clear.

---

### 9. Compliance Evidence Pack / Audit Binder

**Problem:** When challenged by authorities, insurers, clients, or advisors,
companies need a coherent evidence bundle quickly.

**Primary users:** HR, legal, finance, mobility, external advisors.

**MVP scope:**

- Generate evidence pack for employee, project, company, or date range.
- Include trips, day counts, alerts, approvals, documents, A1 status, posted
  worker status, and audit-log extracts.
- Export as PDF plus CSV attachments where useful.
- Include generation timestamp and generated-by user.

**Later scope:**

- Signed evidence manifest.
- Shareable advisor link.
- Pack templates for insurer, tax advisor, immigration advisor, or internal
  audit use cases.

**Data needs:** Trip records, reports, approvals, documents, audit events,
company metadata.

**Risks:** Evidence packs must be accurate and reproducible. Do not include
documents the requesting user is not allowed to access.

---

### 10. Company Travel Policy Rules Engine

**Problem:** Customers have internal travel policies that go beyond Schengen
law, such as approval thresholds, passport buffers, destination restrictions,
or high-risk country escalation.

**Primary users:** HR, travel managers, operations, legal.

**MVP scope:**

- Admin-defined policy rules using simple condition/action patterns.
- Initial conditions: country, days used, days remaining, passport status,
  document expiry, destination risk level, employee group.
- Initial actions: warn, require approval, block submission, require document.
- Rule result shown in travel request and approval workflow.

**Later scope:**

- Rule templates by compliance module.
- Rule versioning.
- Test mode against historical trips.

**Data needs:** Rule definitions, conditions, actions, active/inactive state,
evaluation snapshot.

**Risks:** Keep early rule authoring constrained. Avoid a complex free-form
rules UI until real customer policies are known.

---

### 11. Lightweight Multi-Country Rules Engine

**Problem:** Future modules need reusable rule evaluation rather than bespoke
logic for every compliance regime.

**Primary users:** Internal product/engineering first; admins later.

**MVP scope:**

- Internal framework for deterministic rules.
- Versioned rule definitions.
- Inputs from employee, trip, company settings, documents, and country metadata.
- Outputs: pass, warning, failure, needs review, not applicable.
- Store rule evaluation snapshots for auditability.

**Later scope:**

- Admin-configurable rules.
- Country content packs.
- External rule-content partner integration.

**Data needs:** Rule definitions, input schema, output schema, evaluation log.

**Risks:** Do not overbuild. The first implementation should support real
features such as approvals, A1 review flags, posted-worker flags, and company
policy rules.

---

### 12. Project-Based Compliance Views

**Problem:** Compliance risk is often tied to client projects, worksites, and
engagements, not only individual employees.

**Primary users:** Operations, project managers, HR, finance, tax.

**MVP scope:**

- Optional project/client reference on trips or travel requests.
- Project dashboard showing travellers, countries, total days, open approvals,
  and missing documents.
- Export project-level travel evidence.

**Later scope:**

- Project-level A1 and posted-worker tracking.
- Client-site risk profile.
- Project budget / travel exposure reporting.

**Data needs:** Project/client record, trip association, travel request
association, employee association.

**Risks:** Keep project fields optional for SMB customers.

---

### 13. Workation / Remote-Work Approval Flow

**Problem:** Remote work from another country creates immigration, tax,
social-security, payroll, duty-of-care, and policy risk.

**Primary users:** HR, people teams, finance, legal, employees.

**MVP scope:**

- Employee submits a workation request with country, dates, work pattern, and
  manager.
- Run Schengen, passport, and company-policy checks.
- Capture whether work is remote work, client work, training, conference, or
  ordinary business travel.
- Approval outcome and evidence stored.

**Later scope:**

- A1 and posted-worker checks.
- PE early-warning questions.
- Tax advisor review workflow.

**Data needs:** Work purpose, work location, employer entity, manager, client
or project, approval state.

**Risks:** This can drift into tax and employment advice. Keep MVP as policy
and evidence workflow with risk flags.

---

### 14. Duty Of Care / High-Risk Destination Layer

**Problem:** Employers need to know who is travelling, where they are, and
whether destination conditions create additional duty-of-care obligations.

**Primary users:** HR, risk, operations, travel managers.

**MVP scope:**

- Destination risk label by country.
- Traveller list by country and date range.
- Warning on travel request for high-risk destinations.
- Crisis export: employees in or travelling to affected country.

**Later scope:**

- Travel advisory provider integration.
- Incident log.
- Pre-trip briefing acknowledgement.

**Data needs:** Country risk metadata, trip dates, employee contact details,
emergency contact optional.

**Risks:** Do not promise safety outcomes. Treat as decision support and
record-keeping.

---

### 15. EES Awareness And ETIAS Preparation

**Problem:** EES and ETIAS will make border tracking and pre-travel
authorisation more visible for non-EU travellers.

**Primary users:** HR, mobility, travel managers, employees.

**MVP scope:**

- Store traveller nationality and visa-exempt/visa-required status where known.
- Surface EES/ETIAS education in relevant trip flows.
- Track ETIAS status once operationally necessary: unknown, not required,
  required, applied, approved, expiring, expired.
- Include ETIAS and passport state in pre-travel approval checks.

**Later scope:**

- ETIAS expiry reminders.
- Bulk ETIAS readiness report.
- Links to official resources.

**Data needs:** Nationality, passport country, ETIAS status, ETIAS expiry,
trip destination.

**Risks:** EES/ETIAS timelines and operational rules can change. Re-validate
dates and requirements before building.

---

## Deferred Or Partner-Led Opportunities

These opportunities remain interesting but should not drive near-term build
priority.

| Feature | Rating | Recommendation |
|---------|--------|----------------|
| Full Overseas Worker Tax Compliance Module | 6/10 | Defer or partner-led; split into time-in-country and workation workflows first |
| US Substantial Presence Test Module | 6.5/10 | Later optional add-on for customers with US exposure |
| Permanent Establishment Risk Flags | 7/10 | Later; use light early-warning only unless partnered with tax experts |
| Global Visa / Work Permission Checker | 6.5/10 | Later; content-heavy and high-liability |
| Regulatory Change Monitor | 6.5/10 | Later; requires source/content operations |
| Global Market Expansion | 6/10 | Later; Europe-first depth is stronger |
| Advisor / External Reviewer Portal | 7/10 | Later; useful after evidence packs and advisory partnerships |
| Insurance Travel Pattern Reports | 6.5/10 | Bundle into duty-of-care or board reporting |
| Benchmarking / Board Report Pack | 6/10 | Later; needs more customer data |
| Enterprise RBAC Upgrade | 5/10 | Build when enterprise demand appears |
| iPad / Mobile PWA | 5.5/10 | Responsive web first; PWA later |
| Desktop Application | 2/10 | Avoid for now |

---

## Packaging Notes

### Core Plan

- Schengen 90/180 tracking
- Employee and trip management
- Basic alerts
- Basic exports
- Passport validity status

### Pro Plan

- Time in Country Reports
- Travel Document Hub
- Renewal And Expiry Command Center
- Employee self-service
- Pre-travel requests and approvals

### Compliance Plus

- A1 tracking
- Posted-worker notification tracking
- Compliance Evidence Packs
- Company policy rules
- Project-based compliance views

### Enterprise

- SSO / SCIM
- API and webhooks
- Advanced integrations
- Advisor/external reviewer access
- Advanced audit exports
- Custom retention and security review support

---

## Implementation Dependencies

The roadmap likely requires these platform capabilities over time:

- Document metadata and secure storage model.
- Travel request and approval state model.
- Rule evaluation snapshots for auditability.
- Employee self-service access model.
- Expanded employee profile fields for nationality, passport, residence, and
  social-security country.
- Project/client reference model.
- Export bundling for evidence packs.
- Integration event model for future HRIS, calendar, and travel-booking sources.

---

## Validation Requirements Before Build

Before implementing any regulated feature, validate:

1. Current official rules and deadlines.
2. Source authority and update cadence.
3. Whether the product can safely provide a deterministic check or only a
   "needs review" flag.
4. Required disclaimers.
5. Data retention, privacy, and deletion requirements.
6. Whether the feature changes pricing, packaging, or terms.
7. Whether the feature needs legal, immigration, tax, payroll, or insurance
   partner review.

---

## Next Recommended Specs

Create separate build specs for:

1. Pre-Travel Compliance Approval Workflow.
2. Time in Country Reports.
3. Travel Document Hub plus Passport Validity Checker.
4. Employee Self-Service Data Capture.
5. A1 and Posted Worker Tracking MVP.

