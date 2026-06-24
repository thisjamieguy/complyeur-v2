# Supabase Backup/PITR Restore Drill Precheck

Date: 2026-06-24
Executed by: Codex with James Walsh
Environment reviewed: production Supabase project `complyeur-prod`
Project ref: `bewydxxynjtfpytunlcq`
Region: `eu-west-2` / West Europe (London)
Result: Blocked for full restore-drill sign-off

## Summary

This precheck verified that production daily physical backups exist and captured a
non-PII production validation baseline for a future isolated restore drill.

The full Backup/PITR restore drill is not complete because:

- PITR is currently disabled for production.
- The attempted production-data preview branch restore failed before validation.
- The documented Supabase "Restore to a new project" flow requires dashboard
  confirmation and cost review before creating a production-data copy.

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

| Table | Production row count |
| --- | ---: |
| `admin_audit_log` | 7 |
| `alerts` | 0 |
| `audit_log` | 0 |
| `companies` | 5 |
| `company_user_invites` | 0 |
| `employee_compliance_snapshots` | 0 |
| `employees` | 2 |
| `import_sessions` | 0 |
| `notification_log` | 0 |
| `profiles` | 3 |
| `trips` | 0 |

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

## External Documentation Checked

Supabase documentation reviewed on 2026-06-24:

- Database Backups: `https://supabase.com/docs/guides/platform/backups`
- Restore to a New Project: `https://supabase.com/docs/guides/platform/clone-project`

Relevant operational points:

- Pro projects receive daily backups; PITR is a separate add-on.
- PITR provides finer-grained restore points and replaces daily backups when
  enabled.
- Restoring to a new project creates an independent database copy and requires
  paid-plan/physical-backup support.
- The new project copy includes database schema/data/auth records, but not
  storage objects, Edge Functions, auth settings, API keys, realtime settings,
  read replicas, or all project configuration.
- Restored copies should be reviewed for external-operation extensions such as
  `pg_net` or `pg_cron`.

## Full Drill Blockers

| Blocker | Why it matters | Required owner action |
| --- | --- | --- |
| PITR disabled | The public release gate asks for Backup/PITR evidence, but only daily physical backups are currently available. | Enable PITR add-on or explicitly approve daily-backup-only RPO for this release. |
| Isolated preview restore failed | Row-count, RLS, auth, and app smoke checks must run against a restored copy, not production. The attempted data-bearing preview branch ended in `RESTORE_FAILED`. | Use Supabase Dashboard > Database > Backups > Restore to a New Project, or investigate the preview-branch restore failure with Supabase. |
| Cost and data-copy approval pending | Restore-to-new-project creates an independent paid project containing production data. | Approve the restore target name, cost, lifecycle, and deletion/pause plan. |
| Dashboard screenshots pending | Release evidence requires control-panel restore confirmation screenshots. | Capture backup/restore dashboard screenshots during the restore. |

## Required Next Drill Steps

1. Enable PITR if point-in-time recovery is required for public release.
2. In the Supabase Dashboard, open production project `complyeur-prod`.
3. Go to Database > Backups > Restore to a New Project.
4. Select the target backup or PITR timestamp.
5. Name the isolated target `complyeur-restore-drill-2026-06-24` or equivalent.
6. Confirm cost and restore scope before creating the target.
7. After restore completes, capture the restore confirmation screenshot.
8. Run the row-count query above against the restore target and compare with
   this baseline.
9. Re-run the RLS catalog query against the restore target.
10. Run tenant-isolation smoke tests against the restore target.
11. Run auth and dashboard app smoke tests against an isolated app environment
    pointed at the restore target.
12. Record reviewer sign-off and cleanup/pause/delete the restore target.

## Current Release Decision

Backup existence is verified, and an automated isolated preview-branch restore
attempt was made and cleaned up after Supabase reported `RESTORE_FAILED`.

The Supabase Backup/PITR restore drill gate remains open until an isolated
restore target is created, validated, evidenced, and reviewed. PITR is not
currently enabled.
