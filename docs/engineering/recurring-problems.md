# Recurring Problems

## Summary

These are repeated failure modes seen across current repo artifacts and historical AI context. They should become tests, checklists, or canonical docs rather than recurring conversations.

## Confirmed Problems

- Tenant boundary regressions.
  - Pattern: missing `company_id` filters, missing `requireCompanyAccess()`, overly broad security-definer functions, or RBAC bypass through direct server-action calls.
  - Prevention: security tests, explicit company filters, RLS review, role matrix tests.

- Environment confusion.
  - Pattern: local, preview/test, staging terminology, and production references drifting across docs.
  - Prevention: treat `docs/architecture/ENVIRONMENTS.md` as canonical until formally changed.

- Stale AI-agent context.
  - Pattern: `AGENTS.md`, `CLAUDE.md`, `docs/GEMINI.md`, and `memory/*` drifting from package versions and architecture reality.
  - Prevention: source-of-truth hierarchy in `AGENTS.md`; periodic doc hygiene.

- Compliance-date mistakes.
  - Pattern: changing algorithm behavior based on remembered regulation dates rather than primary-source verification.
  - Prevention: canonical algorithm docs, fixtures, source links, and review dates.

- Import pipeline risk.
  - Pattern: spreadsheet parsing, file validation, macro/file-type handling, and bundle/dependency risk.
  - Prevention: keep import parser server-side where possible, reject dangerous formats, keep dependency audits current.

- Launch-readiness loops.
  - Pattern: repeated AI audits without closing findings or converting them into tracked tests/tasks.
  - Prevention: maintain a current minimum security bar and archive stale audits.

## Historical Context

The exported AI context repeatedly surfaced the same problems: auth/OAuth confusion, Supabase environment drift, missing permission checks, raw error leakage, speculative market expansion, and overlong AI-generated build plans. The useful action is to encode the stable lessons, not migrate the transcripts.

## Risks / Caveats

- Some historical problems are already fixed.
- Some current docs still describe older states.
- Over-documenting every historical issue would reduce signal and make future AI sessions worse.

## Follow-Up Review Needed

- Convert high-risk recurring problems into regression tests where feasible.
- Archive or annotate stale audit docs that describe fixed vulnerabilities.
- Add a scheduled doc hygiene check before major launches.

