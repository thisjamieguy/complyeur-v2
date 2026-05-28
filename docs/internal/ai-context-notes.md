# AI Context Integration Notes

## Summary

This note records the conservative import of distilled AI-context knowledge from historical Claude exports. It is intentionally not a transcript archive. Raw exports remain outside the repository.

Imported long-term engineering value now lives in `docs/engineering/`.

## Source Material

External staging files reviewed:

- `architecture-decisions.md`
- `security-decisions.md`
- `algorithm-decisions.md`
- `mistakes-and-lessons.md`
- `recurring-problems.md`
- `product-decisions.md`
- `launch-decisions.md`
- `ux-ui-decisions.md`
- `open-questions.md`
- `security-review.md`

Only durable engineering material was migrated. Product strategy, launch strategy, UX opinions, open-ended questions, and raw security-export details were excluded from permanent engineering docs unless they directly affected implementation risk.

## Repository Safety Review

No tracked raw Claude export files were found under the expected export names:

- `conversations.json`
- `memories.json`
- `users.json`
- `projects/`
- `design_chats/`
- Claude export archives

`.gitignore` now blocks those raw export paths and common AI export directories.

Risk notes from the redacted scan:

- `.cursor/debug.log` contained many email-like strings and was removed from git tracking on 2026-05-28. Keep `.cursor/` ignored.
- Tracked screenshot evidence files under `docs/compliance/soc2/evidence/screenshots/` contain email-like text detected by OCR-style binary scanning. Verify they are safe evidence artifacts.
- `scripts/pii-log-redaction-demo.mjs` previously contained Stripe-shaped demo strings; these were replaced with non-token-shaped demo placeholders.
- Many test fixtures and docs intentionally contain sample email addresses, secret keywords, and auth/security terminology. Those were not treated as live secrets.

No raw secret values are reproduced in this note.

## Contradictions And Stale Assumptions Found

- `package.json` currently pins `next` to `16.2.6`; older historical docs may still reference Next.js 14/15.
- Current parser dependencies use `exceljs`; older audits still refer to SheetJS/`xlsx` as point-in-time findings.
- Canonical `docs/architecture/ENVIRONMENTS.md` defines two environments: Production and Test/Preview. Some historical operations/security docs still reference staging as a separate environment and are marked as snapshots.
- `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md` contains point-in-time findings, including dependency findings that may have been remediated by current package changes.
- Historical product and launch notes contain market, EES, tax, and legal claims that require current primary-source review before public or product use.

## Files Intentionally Not Migrated

- `product-decisions.md`
- `launch-decisions.md`
- `ux-ui-decisions.md`
- `open-questions.md`
- `security-review.md`

Reason: useful for founder/private review, but too speculative, strategy-heavy, or sensitive for permanent engineering docs.

## Follow-Up Review Needed

- Update or archive stale `memory/*` files.
- Reconcile `CLAUDE.md`, `docs/GEMINI.md`, and `docs/ENVIRONMENTS.md` with current package and environment reality.
- Decide whether `.cursor/debug.log` should be removed from git tracking and history.
- Verify screenshot evidence files do not expose personal/customer data.
- Refresh `lib/compliance/constants.ts` Schengen membership review date against primary sources.
