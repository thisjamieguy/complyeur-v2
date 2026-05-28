# Architecture Decisions

## Summary

ComplyEUR is a Next.js App Router, TypeScript, Supabase/PostgreSQL, Tailwind, shadcn/ui, Stripe, and Vercel application. The durable architectural direction is server-authoritative business logic, database-backed tenant isolation, migration-controlled schema evolution, and explicit production safety rails.

## Confirmed Decisions

- Decision: Keep compliance and authorization logic server-side.
  - Why: Client-side checks are UX aids only. Compliance calculations, tenant access, exports, billing entitlements, and privileged mutations must be enforced by server actions, route handlers, database functions, and RLS.
  - Repository alignment: `lib/compliance/`, `lib/security/tenant-access.ts`, `lib/billing/entitlement-middleware.ts`, and server-action tests.
  - Confidence: High.

- Decision: Use Supabase PostgreSQL with RLS as a hard tenant boundary, plus application-layer `company_id` filtering.
  - Why: RLS protects the database boundary; app-layer filters provide defense in depth and make access intent reviewable.
  - Repository alignment: `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`, `supabase/migrations/20260303113000_harden_multi_tenant_boundaries.sql`, `__tests__/security/`.
  - Confidence: High.

- Decision: Use migrations as the only normal path for schema changes.
  - Why: Direct remote schema edits create environment drift and unreviewed production risk.
  - Repository alignment: `docs/architecture/MIGRATION_WORKFLOW.md` and `supabase/migrations/`.
  - Confidence: High.

- Decision: Treat production and test/preview as isolated environments.
  - Why: Customer data and test data must never mix.
  - Repository alignment: `docs/architecture/ENVIRONMENTS.md`.
  - Confidence: High.

- Decision: Keep import, reporting, calendar, admin, GDPR, and billing as bounded modules.
  - Why: Each has distinct data access, compliance, and failure modes.
  - Repository alignment: `app/(dashboard)/import`, `app/(dashboard)/exports`, `app/(dashboard)/calendar`, `app/admin`, `app/(dashboard)/gdpr`, `lib/billing`.
  - Confidence: High.

## Historical Context

Historical AI exports repeatedly discussed a move from an older Flask implementation to the current Next.js/Supabase stack. That history explains why this repo emphasizes explicit architecture docs, migration workflow, tenant isolation, and AI-agent continuity. It should not be used to infer current implementation details without checking this repo.

## Risks / Caveats

- Some older memory files still mention Next.js 14/15, SheetJS, or a three-environment staging model. Current code uses Next.js 16.2.6 and ExcelJS, and canonical architecture docs define production plus test/preview.
- `CLAUDE.md`, `memory/*`, and older audit docs may contain stale operational details.
- Architecture docs should be updated when the environment model, framework version, or import parser changes.

## Follow-Up Review Needed

- Reconcile `CLAUDE.md`, `docs/GEMINI.md`, and `memory/ARCHITECTURE.md` with the current repo.
- Decide whether stale historical memory files should be archived, updated, or replaced by this directory.
- Keep `docs/architecture/README.md` linked from future onboarding material.

