# DPA Readiness And Evidence Tracker

Last reviewed: 2026-06-16

Status: DPA package is repo-ready for legal/DPO review, but not approved for
external signature.

This document explains why the DPA keeps appearing in release checks and what
must happen to close it. It is an implementation and evidence tracker, not legal
advice.

## Current Position

The DPA problem is not that the repository has no DPA. The repository has a
customer DPA template at `docs/legal/DPA_TEMPLATE.md`, plus a GDPR operating
record at `docs/legal/PRIVACY_OPERATING_RECORD.md`.

The open blocker is legal approval and evidence attachment:

- ComplyEur's customer DPA needs legal/DPO approval before it is sent as final.
- Active subprocessors need account-level DPA/SCC or equivalent transfer
  evidence attached where available.
- Public claims must not overpromise exclusive UK/EEA processing, backup
  posture, or final GDPR readiness until the evidence supports them.

## Decision

Use `docs/legal/DPA_TEMPLATE.md` as the review-ready customer DPA draft.

Use this file as the release tracker for:

- legal/DPO signoff;
- subprocessor DPA/SCC evidence;
- account dashboard screenshots or exports;
- remaining customer-ready packaging tasks.

Do not maintain competing DPA status text in historical audit docs. Current
release decisions should link back here.

## External Template Review

The downloaded GDPR.eu template from
`/Users/jameswalsh/Downloads/Data-Processing-Agreement-Template.pdf` and the
source page at https://gdpr.eu/data-processing-agreement/ were reviewed on
2026-06-16.

Findings:

- The GDPR.eu template is a generic controller-to-processor DPA adapted from a
  ProtonMail template and is not official legal advice.
- It usefully highlights several contract mechanics that were worth adding to
  ComplyEur's draft: definitions, processor-personnel access/reliability,
  data-subject request notification, DPIA/prior-consultation assistance,
  deletion confirmation, notices, and confidentiality.
- Its older generic transfer clause assumes prior written consent before
  transfers outside the EU/EEA. ComplyEur's draft keeps a SaaS-appropriate
  transfer model based on UK/EEA processing where evidenced, subprocessors, SCCs,
  UK transfer addenda/IDTA, adequacy, and equivalent safeguards.
- Do not copy the GDPR.eu text verbatim into customer documents. Use the
  ComplyEur-specific DPA draft and send it for legal/DPO review.

## Approval Checklist

| Item | Owner | Status | Evidence / next action |
| --- | --- | --- | --- |
| Confirm ComplyEur legal entity name | Legal owner | Open | Replace `[Legal Entity Name]` in `docs/legal/DPA_TEMPLATE.md`. |
| Confirm main agreement relationship | Legal owner | Drafted in Terms; legal review open | Public Terms now include conditional DPA relationship language. Legal must decide whether the final DPA attaches to Terms, MSA, order form, or all three. |
| Review controller/processor role split | Legal/DPO owner | Open | Confirm ComplyEur is processor for customer-managed employee/traveller data and controller for account, billing, security, support, marketing, and operational data. |
| Review categories of personal data and data subjects | Legal/DPO owner | Repo-ready | Compare `docs/legal/DPA_TEMPLATE.md` with `docs/legal/PRIVACY_OPERATING_RECORD.md` and current schema. |
| Review technical and organizational measures | Security owner + Legal/DPO owner | Repo-ready | Evidence links are in `docs/legal/PRIVACY_OPERATING_RECORD.md` and `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`. |
| Review international-transfer wording | Legal/DPO owner | Open | Confirm transfer mechanism wording and whether UK IDTA/addendum wording should be explicit in signed customer terms. |
| Review liability/order-of-precedence wording | Legal owner | Open | Align with current Terms/MSA/order form. |
| Confirm subprocessor notice process | Legal owner | Open | Decide customer notification period and objection process. |
| Confirm ICO registration position | Legal owner | Open | File evidence or explicit rationale under `docs/operations/evidence/`. |
| Approve external use | Legal/DPO owner | Open | Remove draft warning from DPA only after signoff is recorded. |

## Subprocessor DPA/SCC Evidence

Official provider references were checked on 2026-06-16. These links prove that
provider DPA or data-processing terms exist; they do not prove ComplyEur has
accepted them in the relevant account. Account-level acceptance evidence still
needs to be filed before public/paid launch where applicable.

| Processor | Use in ComplyEur | Public DPA / transfer evidence | ComplyEur account evidence needed |
| --- | --- | --- | --- |
| Supabase | Database, Auth, storage, DSAR archive storage | Supabase publishes a DPA page and states the binding version must be requested through the dashboard legal-documents page: https://supabase.com/legal/dpa | Signed/requested DPA or dashboard legal-doc evidence; production project region; backup/PITR settings. |
| Vercel | Hosting, deployment, edge/runtime logs | Vercel DPA includes SCC and UK IDTA transfer language: https://vercel.com/legal/dpa | Project/account legal terms evidence; production region/log settings where available. |
| Stripe | Billing, subscriptions, invoices, payment processing | Stripe publishes a data processing agreement: https://stripe.com/gb/legal/dpa | Live account legal terms/DPA acceptance evidence; billing data retention/tax position. |
| Resend | Transactional email delivery | Resend DPA lists authorized subprocessors and 14-day notice language: https://resend.com/legal/dpa | Account DPA/terms acceptance evidence; sending region/log retention where available. |
| Sentry | Error monitoring and reliability diagnostics | Sentry DPA version 5.1.0 includes processor, SCC, UK Addendum, subprocessor, deletion, and incident terms: https://sentry.io/legal/dpa/ | Organization legal terms/DPA acceptance evidence; session replay disabled evidence; retention settings. |
| Google Analytics | Consent-gated analytics | Google Analytics customers use Google Ads Data Processing Terms through account settings: https://support.google.com/analytics/answer/3379636 | GA account data-processing terms status; consent-mode settings; retention settings. |
| CookieYes | Consent management | CookieYes privacy policy states processor processing is separate from its public controller policy and references a subprocessor list available by request: https://www.cookieyes.com/privacy-policy/ | DPA/subprocessor list from CookieYes account or support; consent-log retention settings. |
| Upstash Redis | Rate limiting and abuse prevention where enabled | Public trust center located at https://trust.upstash.com/; DPA/SCC terms were not confirmed from public page text in this review. | Obtain DPA/SCC evidence from Upstash account/support or remove from production if not used. |
| Cloudflare Turnstile | Bot protection where enabled | Cloudflare customer DPA version 6.4 is public and includes SCC/UK transfer definitions: https://www.cloudflare.com/cloudflare-customer-dpa/ | Account/product enablement evidence and Turnstile settings if enabled in production. |
| Email/support tooling | Customer support and privacy request handling | Tool not yet finalized in the repo record. | Confirm exact tool, DPA/SCC, retention, and access controls before paid/public beta. |

## Customer DPA Package

Before sending the DPA to a customer as final, package:

- signed or approved `docs/legal/DPA_TEMPLATE.md`;
- current subprocessor list;
- privacy policy URL;
- terms/MSA/order form reference;
- security summary or evidence pack approved for external sharing;
- incident contact and privacy contact;
- customer-specific details: legal entity, effective date, notification email,
  and any negotiated subprocessor notice terms.

## Release Impact

Private beta:

- Acceptable only if testers are not told the DPA is final.
- Known issues must state the DPA is review-ready but legally unapproved.

Paid/public beta:

- Blocked until customer DPA approval and subprocessor DPA/SCC evidence are
  complete or a named owner explicitly risk-accepts a limited launch.

Public website:

- Do not claim "GDPR compliant" or "data never leaves the UK/EEA".
- Use conditional language: primary database region plus supporting processors
  and appropriate safeguards.

## Ongoing Rule

When adding a processor, personal-data field, export, email, import source,
monitoring tool, analytics tool, AI feature, or support system, update this file
and `docs/legal/PRIVACY_OPERATING_RECORD.md` in the same change.
