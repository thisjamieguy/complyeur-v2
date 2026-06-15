# Operations Evidence Repository

This directory stores operational evidence used to support release readiness, beta readiness, audit preparation, and recurring verification work.

## Purpose Of Evidence Collection

- Preserve proof that operational controls were reviewed and functioning as expected.
- Keep screenshots, written verification notes, and approval records in one predictable location.
- Support internal reviews, customer due diligence, and future audit requests with traceable artifacts.

## Naming Conventions

Use the following filename format for all artifacts:

`YYYY-MM-DD-description.ext`

Examples:

- `2026-06-04-branch-protection.png`
- `2026-06-04-password-reset-success.png`
- `2026-06-04-recovery-drill.md`

Use clear, specific descriptions that identify the control, workflow, or outcome being evidenced.

## Screenshot Guidance

- Capture the full page or panel needed to show the control or result clearly.
- Include visible timestamps, environment markers, or account context when available.
- Prefer PNG for screenshots and Markdown for written verification notes.
- Pair screenshots with a short Markdown note when the image alone does not explain the result.

## Security Rules

- Do not store secrets, API keys, recovery codes, or service-role credentials in this repository.
- Avoid customer personal data unless its inclusion is necessary and explicitly approved.
- Redact email addresses, names, billing data, and internal identifiers when full values are not required.
- Treat evidence as internal operational material and handle it according to repository access controls.

## Retention Guidance

- Keep evidence long enough to support the related release, beta cycle, incident review, or audit window.
- Retain higher-risk records such as recovery drills, release approvals, and billing verification according to internal compliance and contractual requirements.
- When a record is superseded, add newer evidence rather than overwriting the original artifact.
- Do not delete evidence without confirming applicable retention expectations first.

## Repository Structure

- `branch-protection/`: GitHub protection settings evidence
- `email-verification/`: inbox delivery and spam-placement evidence
- `password-reset/`: password reset and session invalidation evidence
- `recovery-drills/`: disaster recovery and backup verification evidence
- `beta-onboarding/`: beta-user onboarding walkthrough and feedback evidence
- `sentry-alerts/`: alert routing and monitoring ownership evidence
- `support-ownership/`: support ownership records and response targets
- `stripe-verification/`: billing, checkout, webhook, and subscription evidence
- `release-approvals/`: release decision and go-live approval records

