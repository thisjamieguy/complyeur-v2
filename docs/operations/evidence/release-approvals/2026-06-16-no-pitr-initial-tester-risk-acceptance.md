# No PITR Initial Tester Risk Acceptance

Date: 2026-06-16

Decision owner: James Walsh

Environment: Production Supabase project `complyeur-prod`
(`bewydxxynjtfpytunlcq`)

## Decision

Risk accepted for the initial private tester group only.

ComplyEur may proceed with a small, hand-picked initial tester group without
Supabase PITR enabled, provided the conditions below are followed.

This acceptance does not apply to paid beta, public beta, broad tester rollout,
enterprise trials, or production launch.

## Evidence

- `supabase backups list --project-ref bewydxxynjtfpytunlcq -o json` reported
  `pitr_enabled: false`.
- The same command reported no listed physical backups:
  - `backups: []`
  - `physical_backup_data: {}`
- Platform evidence is recorded in
  `docs/operations/evidence/platform-dashboard/2026-06-16-vercel-supabase-sentry-dashboard-evidence.md`.

## Scope Limits

- Maximum cohort: a few chosen testers.
- Test data: testers must use low-sensitivity or synthetic employee/trip data
  where practical.
- No enterprise customer data.
- No broad paid/public beta.
- No claims that backup/PITR is complete.
- Any destructive database operation remains prohibited unless separately
  approved under the production safety rails.

## Compensating Controls

- Production database changes must continue to use migrations and documented
  deployment workflow.
- Production service-role access remains restricted to approved server-side
  paths.
- Public and protected internal health checks are evidenced as passing.
- RLS is enabled on all listed `public` and `storage` tables in the production
  Supabase project.
- Support owner monitors initial tester feedback and escalates data integrity
  issues immediately.

## Expiry

This risk acceptance expires at the earliest of:

- Before paid beta.
- Before public beta.
- Before inviting a broader tester cohort.
- Before accepting enterprise trial data.
- 2026-07-16.

## Required Follow-Up

- Upgrade or configure Supabase backup/PITR coverage, then capture fresh evidence.
- Run an isolated restore drill after backup/PITR coverage exists.
- Update `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md` before expanding the
  beta cohort.

## Result

Accepted with limits for initial private tester group.
