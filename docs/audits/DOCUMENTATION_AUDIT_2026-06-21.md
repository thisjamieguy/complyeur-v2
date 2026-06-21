# Documentation Audit 2026-06-21

Branch: `claude/stale-docs-audit-update-el07cl`
Started: 2026-06-21

Supersedes: [`DOCUMENTATION_AUDIT_2026-06-15.md`](DOCUMENTATION_AUDIT_2026-06-15.md)

## Executive Summary

The documentation set is in good shape and noticeably healthier than the
2026-03-30 gap report described. Most previously flagged gaps are now closed:
the root `README.md` is accurate (v2.0, pnpm, correct stack), and the three P1
documents that were missing in March now exist — `docs/CALCULATION_LOGIC.md`,
`docs/DATA_DELETION_WORKFLOW.md`, and the `/cookies` page.

The remaining drift is small and specific rather than systemic. This audit both
records that drift and fixes the parts that are safe to fix directly. Two items
are config/code changes rather than doc edits and are flagged for owner decision
instead of being changed silently.

No documents were deleted in this sprint.

## Resolved Since The 2026-03-30 Gap Report

The `docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md` P1/P2 list is now largely closed:

- `README.md` — corrected: states v2.0, pnpm workflow, accurate stack (no more
  "v0.1.0" / "Next.js 16" mismatch). ✅
- `docs/CALCULATION_LOGIC.md` — created (rolling window, microstates,
  Ireland/Cyprus exclusion, Romania/Bulgaria, worked examples). ✅
- `docs/DATA_DELETION_WORKFLOW.md` — created (GDPR erasure runbook). ✅
- `app/(public)/cookies/page.tsx` — dedicated Cookie Policy page now exists. ✅
- `CLAUDE.md` — now carries explicit EES (Oct 2025) and Romania/Bulgaria
  (Jan 2025) domain notes. ✅

`docs/DOCUMENTATION_GAP_REPORT_2026-03-30.md` already carries a historical-snapshot
banner; it remains useful as an audit trail and needs no edits.

## Source Of Truth Files (unchanged from 2026-06-15, verified current)

- `docs/README.md`: central documentation map and authority model.
- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`: release decision authority.
- `docs/architecture/ENVIRONMENTS.md`: architecture/environment authority.
- `docs/architecture/MIGRATION_WORKFLOW.md`: migration workflow authority.
- `docs/RUNBOOK.md`: operations and recovery authority.
- `docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`: GDPR/public-release workplan.
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`: current security posture summary.
- `docs/testing/e2e-page-coverage.md`: E2E page coverage reference.
- `docs/engineering/README.md`: durable engineering memory and ADR index.

Environment docs were spot-checked against `CLAUDE.md` and confirmed consistent:
prod `bewydxxynjtfpytunlcq` (London), test/preview `ympwgavzlvyklkucskcj`
(Frankfurt), with `complyeur-staging` and legacy ref `sheqtawytsidyhzpzefk`
both correctly marked inactive in `docs/ENVIRONMENTS.md`.

## Stale / Broken Items Found

| # | Item | Severity | Detail |
|---|------|----------|--------|
| 1 | `.env.example` missing | High | Both `README.md` and `CLAUDE.md` instruct `cp .env.example .env.local`, but the file did not exist and was excluded by `.gitignore` (`.env*`). New-engineer setup silently has no template to copy. **Fixed this sprint.** |
| 2 | `docs/CALCULATION_LOGIC.md` not in doc map | Medium | The compliance-engine spec existed and is linked from root `README.md`, but was absent from `docs/README.md`, the canonical navigation surface. **Fixed this sprint.** |
| 3 | `CHANGELOG.md` ~93 commits behind | Medium | Last dated entry is `2026-04-14`; the hardening sprint (2026-06-15) and later fixes are not folded in. Version label `0.0.1.0` is also malformed. An `[Unreleased]` pointer was added this sprint; a proper catch-up pass is still owner work. |
| 4 | `package.json` `db:types` uses inactive project ref | Medium | The script targets `--project-id sheqtawytsidyhzpzefk`, which `docs/ENVIRONMENTS.md` explicitly says must **not** be used "for current deployments or type generation". Flagged for owner decision (code change, not doc). |
| 5 | `docs/GEMINI.md` duplicates `CLAUDE.md` content | Low | Parallel AI-context file; versions currently match reality (Next 16, React 19), but it drifts independently of `CLAUDE.md`/`AGENTS.md` and is a future staleness risk. Recommend it point at `CLAUDE.md` rather than restate the stack. |

## Fixes Applied In This Sprint

1. Created `.env.example` — a fully commented template grouped by service
   (Supabase, Stripe, Resend, Upstash, Sentry, Turnstile, cron, admin, waitlist,
   feature flags, test-only), derived from the env vars actually referenced in
   `app/`, `lib/`, `middleware`, and `scripts/`. Marks each block required vs
   optional. Contains placeholders only — no secrets.
2. Added a `.gitignore` exception (`!.env.example`) so the committed template is
   tracked while real `.env*` files stay ignored.
3. Linked `docs/CALCULATION_LOGIC.md` from `docs/README.md` (Architecture section).
4. Registered this audit in `docs/README.md` "Current Audits" and marked the
   2026-06-15 documentation audit as superseded.
5. Added an `[Unreleased]` note to `CHANGELOG.md` describing the gap and how to
   regenerate the commit list (`pnpm changelog`).

## Flagged For Owner Decision (not changed automatically)

- **`db:types` project ref (item 4):** changing a build/tooling script can break
  an established local workflow. The doc-consistent value is the dev/preview ref
  `ympwgavzlvyklkucskcj`. Confirm the intended type-generation source before
  editing `package.json`.
- **CHANGELOG catch-up (item 3):** reconstructing ~93 commits into Keep-a-Changelog
  entries, plus fixing the `0.0.1.0` version scheme, should be a deliberate pass
  with the founder rather than auto-generated.
- **`docs/GEMINI.md` (item 5):** decide whether to keep it as a standalone file or
  reduce it to a stub that defers to `CLAUDE.md`.

## Archive Candidates (carried forward from 2026-06-15)

These remain useful for audit trail but should not sit visually equivalent to
current docs. None were moved this sprint (consistent with prior policy of not
relocating until references are checked):

- `docs/BETA_LAUNCH_CHECKLIST.md`, `docs/BETA_LAUNCH_RESULTS.md`
- `docs/operations/RELEASE-CHECKLIST.md`
- `docs/security/PRE_LAUNCH_SECURITY_AUDIT.md`, `docs/security/SAAS_SECURITY_AUDIT.md`,
  `docs/security/GAP_ANALYSIS.md`
- `docs/audits/PRODUCTION_READINESS_ASSESSMENT.md`,
  `docs/audits/REDDIT_PRODUCTION_READINESS_ASSESSMENT.md`
- `docs/performance-optimization-report.md`

## Recommended Next Actions

1. Resolve the `db:types` project ref so tooling matches `docs/ENVIRONMENTS.md`.
2. Run a CHANGELOG catch-up pass and adopt a single version scheme.
3. Decide on `docs/GEMINI.md` (keep vs stub).
4. Adopt the `docs/archive/` convention from the 2026-06-15 audit and move the
   carried-forward archive candidates in a dedicated cleanup PR.

## Documents Added In This Sprint

- `docs/audits/DOCUMENTATION_AUDIT_2026-06-21.md` (this file)
- `.env.example` (committed template)

## Navigation Updates

- `docs/README.md` updated to link `docs/CALCULATION_LOGIC.md` and this audit, and
  to mark the 2026-06-15 documentation audit as superseded.
