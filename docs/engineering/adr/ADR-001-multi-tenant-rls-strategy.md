# ADR-001: Multi-Tenant RLS Strategy

## Status

Accepted.

## Context

ComplyEUR is a multi-tenant B2B SaaS. Customer data is partitioned by company. A cross-tenant read, write, export, or admin action is a security incident.

## Decision

Tenant isolation is enforced in two layers:

1. Database layer: Supabase/PostgreSQL Row Level Security policies derive tenant access from the authenticated user's profile.
2. Application layer: server-side code derives `companyId` from the authenticated user through `requireCompanyAccess()` or `requireCompanyAccessCached()` and applies explicit `company_id` filters.

Client-provided `company_id`, role, or superadmin state is not trusted.

## Alternatives Considered

- Rely on application-layer filters only.
  - Rejected because one missed filter can expose tenant data.
- Rely on RLS only.
  - Rejected because app-layer intent becomes harder to audit and future RLS regressions have no defense in depth.
- Single-tenant deployments per customer.
  - Deferred because it increases operational complexity and is not the current product model.

## Risks

- RLS policies and security-definer functions can become complex.
- App-layer code can drift if new actions bypass tenant helpers.
- Tests must cover both read and mutation paths.

## Consequences

- All tenant tables must have RLS enabled.
- All tenant-scoped server actions, route handlers, DB helpers, and exports must derive company access server-side.
- Superadmin bypasses require explicit opt-in and review.
- Tenant isolation tests are not optional.

## Current Repository Alignment

- `lib/security/tenant-access.ts` derives user, company, role, and superadmin context from Supabase Auth and `profiles`.
- `supabase/migrations/20260303113000_harden_multi_tenant_boundaries.sql` and later hardening migrations strengthen tenant boundaries.
- `__tests__/security/` and integration tests exercise multi-tenant behavior.
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md` tracks remaining authorization gaps.

