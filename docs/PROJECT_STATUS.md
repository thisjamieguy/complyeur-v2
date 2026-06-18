# Project Status

Status: Active operational snapshot  
Last updated: 2026-06-18  
Purpose: Give contributors and agents a short, current view of what ComplyEur is doing now, what is blocked, and how versioning/tagging should be handled.

## Authority And Scope

- This document is operational only. It does not override repository code, migrations, tests, or canonical release/security documents.
- For private-beta go/no-go decisions, use `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`.
- For public paid-release readiness decisions, use `docs/release/PUBLIC_RELEASE_SOURCE_OF_TRUTH.md`.
- For architecture and environment policy, use `docs/architecture/ENVIRONMENTS.md` and related architecture docs.

## Current Milestone

Public release readiness audit and blocker consolidation, with private-beta
evidence as the baseline input.

## Current Objective

Drive the shortest credible path to public release by clearing three remaining
gates: recovery/durability, transactional trust/onboarding, and final
legal/privacy sign-off.

## Current Version Baseline

- Product line: `v2.0.0` Supabase rebuild
- Package metadata version: `2.0.0` in `package.json`
- Current release tag baseline: `v2.0.0`
- Current rule: use annotated Git tags for meaningful milestones and releases only

## Versioning Notes

- The public product version and package metadata are now aligned at `v2.0.0`.
- Treat `v2.0.0` as the current product/release baseline for docs, release planning, and the first clean annotated tag.
- The annotated Git tag `v2.0.0` now exists on the committed release-baseline change.
- When the public version changes, update `README.md`, `AGENTS.md`, this file, and the relevant release document in the same change.

## Active Blockers

- Gate 1: backup/PITR enablement and restore-drill evidence remain open.
- Gate 2: SPF/DKIM/DMARC, multi-provider signup delivery, password reset, and non-founder onboarding evidence remain open.
- Gate 3: public-release legal/DPA/provider-account approval remains open.

## Latest Verified State

- `pnpm typecheck`: passing on the latest recorded hardening pass
- `pnpm lint`: passing on the latest recorded hardening pass
- `pnpm build`: passing on the latest recorded hardening pass
- Compliance-focused suite: passing on the latest recorded hardening pass
- Public-release audit verification on 2026-06-18: compliance, GDPR, security, import, consent, and build checks passed locally
- Authenticated baseline E2E, a11y E2E, and mobile E2E: recorded as passing in the current beta release source of truth

## Recommended Next Work

1. Close Gate 1 by enabling backup/PITR coverage and running the restore drill.
2. Close Gate 2 by fixing email trust and re-running signup, reset, and non-founder journey checks.
3. Close Gate 3 by attaching Gates 1-2 evidence plus the completed billing/monitoring package to the legal/privacy release package.

## References

- `AGENTS.md`
- `docs/README.md`
- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/release/PUBLIC_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`
- `docs/RUNBOOK.md`
