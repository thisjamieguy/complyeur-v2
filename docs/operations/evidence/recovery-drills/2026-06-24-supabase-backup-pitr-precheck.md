# Supabase Backup/PITR Restore Drill Evidence

Date: 2026-06-24
Executed by: Codex with James Walsh
Environment reviewed: production Supabase project `complyeur-prod`
Project ref: `bewydxxynjtfpytunlcq`
Region: `eu-west-2` / West Europe (London)
Restore target reviewed: `complyeur-restore-drill-2026-06-24`
Restore target ref: `ubpztqbdkyesfpcqrohe`
Result: Backup restore drill passed; PITR deferred by accepted cost/RPO decision

## Summary

This drill verified that production daily physical backups exist, restored the
latest backup into an isolated Supabase project, and validated the restored
target with non-PII row-count comparison, RLS checks, migration checks,
tenant-isolation probes, auth smoke, and a local app dashboard smoke.

Accepted residual risk:

- PITR is currently disabled for production.
- Owner approved daily-backup-only recovery for beta because the PITR add-on
  cost is not sustainable before revenue.
- Public/beta recovery posture is therefore an RPO of up to 24 hours and an RTO
  based on the validated restore-to-new-project path.

Do not restore directly over production for this release gate.

## Supabase Project And Plan Evidence

Read-only checks performed:

- `supabase projects list`
- Supabase project details via connector
- Supabase organization details via connector

Observed:

| Field | Value |
| --- | --- |
| Production project | `complyeur-prod` |
| Project ref | `bewydxxynjtfpytunlcq` |
| Status | `ACTIVE_HEALTHY` |
| Region | `eu-west-2` |
| Postgres version | `17.6.1.063` |
| Organization plan | `pro` |

## Backup Metadata Evidence

Command:

```bash
supabase backups list --project-ref bewydxxynjtfpytunlcq -o json
```

Sanitized result:

| Backup timestamp UTC | Type | Status |
| --- | --- | --- |
| 2026-06-24T03:34:10.189Z | Physical | Completed |
| 2026-06-23T03:35:08.039Z | Physical | Completed |
| 2026-06-22T03:35:01.863Z | Physical | Completed |
| 2026-06-21T03:34:19.359Z | Physical | Completed |
| 2026-06-20T03:35:28.006Z | Physical | Completed |
| 2026-06-19T03:33:40.939Z | Physical | Completed |
| 2026-06-18T03:33:38.347Z | Physical | Completed |
| 2026-06-17T03:34:44.944Z | Physical | Completed |

Additional metadata:

| Field | Value |
| --- | --- |
| `pitr_enabled` | `false` |
| `walg_enabled` | `true` |
| Backup region | `eu-west-2` |

Post-decision live recheck on 2026-06-24 with Supabase CLI `2.75.0`:

| Field | Value |
| --- | --- |
| `pitr_enabled` | `false` |
| `walg_enabled` | `true` |
| Backup region | `eu-west-2` |
| Latest observed backup entry | `2026-06-24T21:51:19.045Z` |
| Latest observed backup status | `PENDING` |

The same recheck still showed completed daily physical backups for
2026-06-17 through 2026-06-24.

Dashboard evidence captured:

- `2026-06-24-supabase-backups-restore-tab.png`
- `2026-06-24-supabase-compute-micro-selection.png`

The screenshot shows the production Supabase Database Backups page on the
`Restore to new project` tab, completed daily backups, and the previous
`complyeur-restore-drill-2026-06-24` restoration marked as removed.

The compute screenshot records the owner-selected cost-control posture:
production compute was moved from Nano to Micro rather than Small. Supabase's
current backup documentation states that PITR requires at least a Small compute
add-on, so Micro does not enable PITR.

## Isolated Branch Restore Attempt

An isolated production-data preview branch was attempted as a lower-confidence
restore-drill target because PITR was disabled and the CLI does not expose the
documented dashboard-only "Restore to a New Project" flow.

Command shape:

```bash
supabase branches create complyeur-restore-drill-2026-06-24 \
  --project-ref bewydxxynjtfpytunlcq \
  --with-data \
  --region eu-west-2 \
  -o json
```

Sanitized result:

| Field | Value |
| --- | --- |
| Branch name | `complyeur-restore-drill-2026-06-24` |
| Branch id | `8a70f128-e695-4801-a60a-0721401c79c2` |
| Preview project ref | `fqzmtfsckrpujodghluv` |
| Source project ref | `bewydxxynjtfpytunlcq` |
| `with_data` | `true` |
| Final observed status | `RESTORE_FAILED` / `RUNNING_MIGRATIONS` |

Cleanup:

```bash
supabase branches delete 8a70f128-e695-4801-a60a-0721401c79c2 \
  --project-ref bewydxxynjtfpytunlcq \
  --yes \
  -o json
```

Follow-up `supabase branches list --project-ref bewydxxynjtfpytunlcq -o json`
showed only the default `main` branch with `ACTIVE_HEALTHY` status. The failed
preview branch no longer appears in the branch list.

No branch credentials, API keys, database URLs, or service-role secrets are
stored in this evidence file.

## Dashboard Restore-To-New-Project

The Supabase Dashboard restore flow was used after the automated preview branch
attempt failed. The restored project was created as an independent isolated
project, not as a production overwrite.

Dashboard evidence captured:

- `2026-06-24-supabase-restored-project-active.png`

Observed restored project metadata:

| Field | Value |
| --- | --- |
| Restored project | `complyeur-restore-drill-2026-06-24` |
| Restored project ref | `ubpztqbdkyesfpcqrohe` |
| Source project | `complyeur-prod` |
| Source project ref | `bewydxxynjtfpytunlcq` |
| Status | `ACTIVE_HEALTHY` |
| Region | `eu-west-2` |
| Created at UTC | 2026-06-24 21:17:38 |
| Compute | Nano |
| Postgres version | `17.6.1.127` |

The restored project remains separate from production and was not wired to the
production app.

Cleanup:

- After validation, project `ubpztqbdkyesfpcqrohe`
  (`complyeur-restore-drill-2026-06-24`) was deleted with
  `supabase projects delete ubpztqbdkyesfpcqrohe --yes -o json`.
- Follow-up `supabase projects list` showed only `complyeur-prod`,
  `complyeur-staging`, and `complyeur-dev`.

## Production Baseline For Future Restore Comparison

Read-only exact row-count query against production:

```sql
with critical_counts as (
  select 'companies' as table_name, count(*)::bigint as row_count from public.companies
  union all select 'profiles', count(*)::bigint from public.profiles
  union all select 'employees', count(*)::bigint from public.employees
  union all select 'trips', count(*)::bigint from public.trips
  union all select 'alerts', count(*)::bigint from public.alerts
  union all select 'notification_log', count(*)::bigint from public.notification_log
  union all select 'audit_log', count(*)::bigint from public.audit_log
  union all select 'admin_audit_log', count(*)::bigint from public.admin_audit_log
  union all select 'company_user_invites', count(*)::bigint from public.company_user_invites
  union all select 'import_sessions', count(*)::bigint from public.import_sessions
  union all select 'employee_compliance_snapshots', count(*)::bigint from public.employee_compliance_snapshots
)
select * from critical_counts order by table_name;
```

Observed row counts:

| Table | Production baseline | Restored target | Result |
| --- | ---: | ---: | --- |
| `admin_audit_log` | 7 | 7 | Match |
| `alerts` | 0 | 0 | Match |
| `audit_log` | 0 | 0 | Match |
| `companies` | 5 | 5 | Match |
| `company_user_invites` | 0 | 0 | Match |
| `employee_compliance_snapshots` | 0 | 0 | Match |
| `employees` | 2 | 2 | Match |
| `import_sessions` | 0 | 0 | Match |
| `notification_log` | 0 | 0 | Match |
| `profiles` | 3 | 3 | Match |
| `trips` | 0 | 0 | Match |

## RLS Baseline

Read-only catalog query confirmed RLS enabled on the critical production tables:

| Table | RLS enabled |
| --- | --- |
| `admin_audit_log` | Yes |
| `alerts` | Yes |
| `audit_log` | Yes |
| `companies` | Yes |
| `company_entitlements` | Yes |
| `company_settings` | Yes |
| `company_user_invites` | Yes |
| `employee_compliance_snapshots` | Yes |
| `employees` | Yes |
| `feedback_submissions` | Yes |
| `import_sessions` | Yes |
| `notification_log` | Yes |
| `notification_preferences` | Yes |
| `profiles` | Yes |
| `stripe_webhook_events` | Yes |
| `trips` | Yes |

Latest production migration observed:

| Version | Name |
| --- | --- |
| `20260618173000` | `harden_stripe_webhook_ordering` |

The restored target reported the same latest migration:

| Version | Name |
| --- | --- |
| `20260618173000` | `harden_stripe_webhook_ordering` |

## Restored Target Tenant-Isolation And Auth Smoke

The existing production RLS/RPC attack probe was run against the restored target
using temporary restored-project credentials stored under `/private/tmp` and
deleted after validation.

Command shape:

```bash
CONFIRM_PRODUCTION_SUPABASE_RLS_PROBE=true \
  NEXT_PUBLIC_SUPABASE_URL=https://ubpztqbdkyesfpcqrohe.supabase.co \
  pnpm exec tsx scripts/security/production-rls-attack-probe.ts
```

Run id: `mqsl6ub6-e61d4915`

Result: 13 checks passed.

Validated controls:

| Check family | Result |
| --- | --- |
| Cross-tenant employee read blocked | Pass |
| Cross-tenant trip read blocked | Pass |
| Same-tenant employee read positive control | Pass |
| Cross-tenant trip update blocked | Pass |
| Cross-tenant alert delete blocked | Pass |
| Cross-tenant employee insert blocked | Pass |
| Cross-tenant trip insert blocked | Pass |
| Viewer invite metadata read blocked | Pass |
| Viewer invite update blocked | Pass |
| Cross-tenant seat usage RPC blocked | Pass |
| Cross-tenant user-limit RPC blocked | Pass |
| Cross-tenant ownership transfer RPC blocked | Pass |
| Viewer ownership transfer RPC blocked | Pass |

Cleanup:

- Main run cleanup reported `cleanupErrors: []`.
- Cleanup-only verification for run id `mqsl6ub6-e61d4915` found no remaining
  probe users or companies.
- Post-cleanup row counts matched the restored baseline.

## Restored Target App Smoke

A local Next.js app was started with environment variables pointing at the
restored project, not production. Playwright used the real `/login` UI and a
disposable restored-project test account.

Command shape:

```bash
E2E_ALLOW_REMOTE_SUPABASE=true \
  TEST_USER_EMAIL=restore-smoke-20260624@complyeur.test \
  TEST_USER_COMPANY=RestoreDrillSmoke20260624 \
  PLAYWRIGHT_PORT=3111 \
  pnpm exec playwright test e2e/auth-smoke.spec.ts --project=chromium
```

Result:

- `1 passed (25.4s)`
- Auth setup created and signed in as the disposable restored-project user.
- The test reached `/dashboard`.
- The dashboard heading `Employee Compliance` was visible.

Cleanup:

- Disposable smoke user remaining count: `0`.
- Disposable smoke company remaining count: `0`.
- Post-cleanup row counts matched the restored baseline.
- Temporary API keys, service-role key file, local auth state, and Playwright
  reports were deleted after validation.

## External Documentation Checked

Supabase documentation reviewed on 2026-06-24:

- Database Backups: `https://supabase.com/docs/guides/platform/backups`
- Restore to a New Project: `https://supabase.com/docs/guides/platform/clone-project`

Relevant operational points:

- Pro projects receive daily backups; PITR is a separate add-on.
- PITR provides finer-grained restore points and replaces daily backups when
  enabled.
- PITR requires at least a Small compute add-on; Micro does not satisfy the
  PITR prerequisite.
- Restoring to a new project creates an independent database copy and requires
  paid-plan/physical-backup support.
- The new project copy includes database schema/data/auth records, but not
  storage objects, Edge Functions, auth settings, API keys, realtime settings,
  read replicas, or all project configuration.
- Restored copies should be reviewed for external-operation extensions such as
  `pg_net` or `pg_cron`.

## Accepted Recovery Risk

| Risk | Why it matters | Accepted decision |
| --- | --- | --- |
| PITR disabled | Without PITR, production can lose up to a day of database changes depending on the last successful daily backup. | Owner accepted daily-backup-only RPO for beta/public readiness at the current budget level. Enable PITR after first paying customer, customer/security requirement, or materially higher production data value. |

## Current Release Decision

Backup existence, daily-backup restore validation, and the PITR cost/RPO
decision are complete for the current beta/public-readiness gate.

Production PITR is not enabled and should not be represented as enabled. The
release posture is daily physical backups with accepted RPO of up to 24 hours.
If a customer, contract, security review, or revenue milestone requires tighter
recovery, upgrade production to at least Small compute, enable the PITR add-on,
capture fresh evidence, and update this note.

The isolated restored project was deleted after validation.
