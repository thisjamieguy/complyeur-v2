# ADR-003: Audit Log Immutability

## Status

Accepted.

## Context

ComplyEUR needs auditability for compliance workflows, GDPR actions, admin actions, imports, exports, and security investigations. Audit trails lose value if tenant users or ordinary application paths can rewrite or delete them.

## Decision

Audit logs are append-only and tamper-evident:

- Application code inserts audit events rather than updating historical events.
- Audit entries include hash-chain metadata where applicable.
- Database triggers and policies prevent tenant-level update/delete of audit rows.
- GDPR audit retention preserves a checkpoint hash when old audit rows are purged through service-role-only cleanup.

## Alternatives Considered

- Mutable audit rows with ordinary CRUD.
  - Rejected because it weakens incident reconstruction and compliance evidence.
- Logs only in an external provider.
  - Rejected because application-domain audit trails must be queryable by company and tied to application entities.
- Never purging audit logs.
  - Rejected because GDPR/data-retention obligations may require controlled retention.

## Risks

- Hash-chain verification can be broken by incomplete retention logic.
- Service-role cleanup must remain tightly controlled.
- Audit metadata can itself contain sensitive data if callers log too much.

## Consequences

- Audit-writing helpers must sanitize and minimize details.
- Update/delete policies on audit tables are forbidden except controlled retention paths.
- Any retention purge must preserve enough checkpoint state for later verification.

## Current Repository Alignment

- `lib/gdpr/audit.ts` creates and verifies hash-chained GDPR audit entries.
- `lib/admin/audit.ts` writes admin audit events.
- `supabase/migrations/20260414220000_complete_tenant_isolation_hardening.sql` adds append-only enforcement and revokes broad audit-log privileges.
- `supabase/migrations/20260518110000_gdpr_audit_retention_and_export_storage.sql` preserves retention checkpoint hashes and limits purge execution to `service_role`.

