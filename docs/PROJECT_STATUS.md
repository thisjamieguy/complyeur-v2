# Project Status

Status: Active operational snapshot  
Last updated: 2026-06-17  
Purpose: Give contributors and agents a short, current view of what ComplyEur is doing now, what is blocked, and how versioning/tagging should be handled.

## Authority And Scope

- This document is operational only. It does not override repository code, migrations, tests, or canonical release/security documents.
- For private-beta go/no-go decisions, use `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`.
- For architecture and environment policy, use `docs/architecture/ENVIRONMENTS.md` and related architecture docs.

## Current Milestone

Private beta readiness hardening and release evidence completion.

## Current Objective

Close the remaining operational and verification gaps required for a controlled private beta and prepare a clean baseline for release tagging.

## Current Version Baseline

- Product line: `v2.0.0` Supabase rebuild
- Package metadata version: `2.0.0` in `package.json`
- First intended release tag baseline: `v2.0.0`
- Current rule: use annotated Git tags for meaningful milestones and releases only

## Versioning Notes

- The public product version and package metadata are now aligned at `v2.0.0`.
- Treat `v2.0.0` as the current product/release baseline for docs, release planning, and the first clean annotated tag.
- The first external release tag should be created from a committed, reviewable state rather than from a dirty working tree.
- When the public version changes, update `README.md`, `AGENTS.md`, this file, and the relevant release document in the same change.

## Active Blockers

- Sentry alert-routing evidence is still pending.
- Restore-drill evidence and broader backup/PITR coverage remain open before broader rollout.
- Non-founder onboarding and multi-provider email checks still need fresh verification.
- Billing lifecycle and webhook replay evidence remain open before paid/public beta.

## Latest Verified State

- `pnpm typecheck`: passing on the latest recorded hardening pass
- `pnpm lint`: passing on the latest recorded hardening pass
- `pnpm build`: passing on the latest recorded hardening pass
- Compliance-focused suite: passing on the latest recorded hardening pass
- Authenticated baseline E2E, a11y E2E, and mobile E2E: recorded as passing in the current beta release source of truth

## Recommended Next Work

1. Capture Sentry alert-rule and test-delivery evidence.
2. Run the documented recovery procedure against an isolated restore target and record the result.
3. Complete non-founder onboarding and password-reset verification.
4. Decide the first release tag event and align package metadata if the runtime version should match it.

## References

- `AGENTS.md`
- `docs/README.md`
- `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`
- `docs/RUNBOOK.md`
