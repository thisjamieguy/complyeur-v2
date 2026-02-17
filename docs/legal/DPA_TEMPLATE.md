# Data Processing Agreement (DPA) Template

This template is for ComplyEur customer agreements where the customer is the Controller and ComplyEur is the Processor.

Status: Draft template for legal review before external use.

---

## 1. Parties
- Controller: `[Customer Legal Entity]`
- Processor: `ComplyEur [Legal Entity Name]`
- Effective Date: `[YYYY-MM-DD]`

## 2. Subject Matter and Duration
- Subject matter: Processing of employee travel compliance data to provide ComplyEur services.
- Duration: For the term of the main services agreement and until deletion/return obligations are completed.

## 3. Nature and Purpose of Processing
- Host and process customer account, employee, and trip data.
- Calculate Schengen 90/180-day compliance status.
- Provide alerts, exports, audit logs, and support operations.

## 4. Categories of Data Subjects
- Customer admins and users.
- Customer employees whose travel is tracked.

## 5. Categories of Personal Data
- Account data: name, email, company details.
- Employee data: name, optional email, nationality type.
- Trip data: entry/exit dates, country, travel day totals.
- Operational metadata: timestamps, audit logs, security logs.

## 6. Processor Obligations
- Process personal data only on documented Controller instructions.
- Ensure personnel confidentiality obligations.
- Implement appropriate technical and organizational security measures.
- Assist Controller with data subject rights requests.
- Assist with GDPR Article 32-36 obligations as applicable.
- Make available information needed to demonstrate compliance.

## 7. Security Measures
- Encryption in transit (TLS) and at rest via platform controls.
- Role-based access controls with least privilege.
- Row-level security controls for tenant isolation.
- Audit logging and incident monitoring.
- Backup and recovery procedures per `docs/RUNBOOK.md`.

## 8. Sub-Processors
ComplyEur uses the following sub-processors:
- Supabase (database/auth/infrastructure)
- Vercel (application hosting and delivery)
- Stripe (billing and payment processing)
- Resend (transactional email delivery)
- Sentry (error monitoring)

Processor will maintain and update this list and notify Controller of material changes where contractually required.

## 9. International Transfers
- Data may be processed in the UK, EEA, and other locations operated by approved sub-processors.
- Where required, transfers rely on Standard Contractual Clauses or equivalent safeguards.

## 10. Incident and Breach Notification
- Processor will notify Controller without undue delay after becoming aware of a personal data breach involving Controller data.
- Notification will include known facts, likely impact, and mitigation actions.
- Processor will provide updates as investigation proceeds.

## 11. Data Subject Rights and Assistance
- Controller remains responsible for validating requests.
- Processor will provide technical assistance for access, correction, deletion, restriction, objection, and portability requests.

## 12. Return and Deletion
- On termination, Processor will delete or return personal data per Controller instruction, except where retention is legally required.
- Deletion includes production systems and expires from backups according to retention policy.

## 13. Audit and Compliance Information
- Processor will provide reasonable compliance documentation on request.
- Additional audits require reasonable notice and must not compromise other customers' security or confidentiality.

## 14. Liability and Governing Terms
- Liability and governing law follow the main agreement unless this DPA states otherwise.

---

## Signature Blocks

Controller:
- Name:
- Title:
- Date:
- Signature:

Processor (ComplyEur):
- Name:
- Title:
- Date:
- Signature:
