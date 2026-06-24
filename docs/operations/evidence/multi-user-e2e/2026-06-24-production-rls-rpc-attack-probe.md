# Production RLS/RPC Attack Probe Evidence

Date: 2026-06-24
Environment: production Supabase project `bewydxxynjtfpytunlcq.supabase.co`
Executor: Codex

## Command

```bash
set -a
source .env.production.sync
set +a
CONFIRM_PRODUCTION_SUPABASE_RLS_PROBE=true \
  pnpm exec tsx scripts/security/production-rls-attack-probe.ts
```

Cleanup verification:

```bash
CONFIRM_PRODUCTION_SUPABASE_RLS_PROBE=true \
CLEANUP_PRODUCTION_SUPABASE_RLS_PROBE_RUN_ID=mqsfpgw4-9od9t7 \
  pnpm exec tsx scripts/security/production-rls-attack-probe.ts
```

## Result

Passed. Run id: `mqsfpgw4-9od9t7`.

The probe created disposable `codex-rls-*` users, companies, employees, trips,
alerts, and invites, then cleaned them up. Cleanup reported no errors. A
cleanup-only verification after the run found no remaining users or companies
for the run id.

## Checks Passed

1. `owner_a` could not read `company_b` employees by `company_id`.
2. `owner_a` could not read `company_b` trips by `company_id`.
3. `owner_a` could read its own employee as a positive control.
4. `owner_a` could not update `company_b` trip by id.
5. `owner_a` could not delete `company_b` alert by id.
6. `owner_a` could not insert an employee into `company_b`.
7. `owner_a` could not insert a trip into `company_b`.
8. `viewer_a` could not read invite metadata for its own company.
9. `viewer_a` could not update invite metadata for its own company.
10. `owner_a` direct RPC could not read `company_b` seat usage.
11. `owner_a` direct RPC could not read `company_b` user limit.
12. `owner_b` direct RPC could not transfer `company_a` ownership.
13. `viewer_a` direct RPC could not transfer `company_a` ownership.

## Output Summary

```text
owner_a cannot read company_b employees by company_id: pass, rows=0
owner_a cannot read company_b trips by company_id: pass, rows=0
owner_a can read own employee positive control: pass
owner_a cannot update company_b trip by id: pass, rows=0
owner_a cannot delete company_b alert by id: pass, rows=0
owner_a cannot insert employee into company_b: pass, RLS violation
owner_a cannot insert trip into company_b: pass, RLS violation
viewer_a cannot read company_a invite metadata: pass, rows=0
viewer_a cannot update company_a invite: pass, rows=0
owner_a direct RPC cannot read company_b seat usage: pass
owner_a direct RPC cannot read company_b user limit: pass
owner_b direct RPC cannot transfer company_a ownership: pass
viewer_a direct RPC cannot transfer company_a ownership: pass
```

## Cleanup

Main run cleanup:

```text
createdUsers: 96354494..., 8eda104a..., 5c943f1b...
createdCompanyIds: 4ee740b8..., 9c0fd049..., 1d4d4665...
cleanupErrors: []
```

Cleanup verification:

```text
userIds: []
companyIds: []
cleanupErrors: []
```

## Caveats

- This evidence covers the current production Supabase schema and RLS/RPC
  posture only.
- Re-run after any Supabase migration, auth/RLS change, team/RPC change, or
  server-side tenant-isolation change.
- The probe intentionally used the production service-role key only to create
  and clean disposable test data; all attack checks used normal authenticated
  Supabase clients.
