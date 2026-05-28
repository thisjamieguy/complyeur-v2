# Mistakes And Lessons

## Summary

This file preserves durable engineering lessons from historical development. It is intentionally brief; detailed incident, audit, and plan documents should stay in their existing folders.

## Confirmed Lessons

- Lesson: Verify the repo before trusting memory.
  - Why: Historical AI context included older Flask, Next.js 14/15, SheetJS, and staging assumptions that no longer match the current repo.
  - Current rule: Code, migrations, tests, and current canonical docs override memory.

- Lesson: Security audits must produce closures, not just more reports.
  - Why: Repeated audits are useful only when findings become fixes, tests, or explicitly accepted risks.
  - Current rule: Link stale audits from current status docs; do not treat every old finding as still live.

- Lesson: Multi-tenant bugs are systemic risks.
  - Why: Missing company filters, profile self-mutation, or overly broad RPCs can become customer-data incidents.
  - Current rule: Auth, tenant access, role checks, and RLS all need review for privileged paths.

- Lesson: Date logic must be boring and heavily tested.
  - Why: The product's value depends on correct rolling-window calculations.
  - Current rule: Prefer deterministic date-only utilities and fixtures over ad hoc parsing.

- Lesson: AI agents need small, current, repo-grounded context.
  - Why: Long historical exports invite stale assumptions and hallucinated architecture.
  - Current rule: Give agents `AGENTS.md`, current docs, and the relevant source files before historical context.

- Lesson: Broad cleanup commands and secret-bearing files need extra caution.
  - Why: Local Docker volumes, env files, debug logs, screenshots, and export archives can carry operational risk.
  - Current rule: Do not run destructive commands or import archives without explicit scope and backup awareness.

## Historical Context

Historical Claude exports are useful as institutional memory, but the safe extracted form is this directory plus `docs/internal/ai-context-notes.md`. Raw exports should remain outside git.

## Risks / Caveats

- Founder workflow notes, market strategy, and personal context do not belong in permanent engineering docs.
- Some lessons may duplicate existing `memory/*` content; the goal here is higher-signal, verified context.

## Follow-Up Review Needed

- Retire or update stale memory docs after this structure is adopted.
- Move stable lessons from old audit reports into this file only when they remain useful.

