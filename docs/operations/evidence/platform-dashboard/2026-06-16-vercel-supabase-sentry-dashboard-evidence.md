# Vercel, Supabase, And Sentry Dashboard Evidence

Date: 2026-06-16

Operator: Codex using read-only Vercel CLI, Supabase connector, Sentry API helper,
and production health probes.

Environment: Production

## Result

PARTIAL PASS

- Vercel production deployment, aliases, encrypted environment-variable presence,
  TLS, and public health are verified.
- Protected internal health is verified with the production cron secret loaded
  locally and not printed.
- Supabase production project health, migrations, Edge Function state, RLS table
  summary, and advisor output are verified.
- Sentry production issue API read access is verified with a newly created
  read-capable personal token, but alert rules, recipients, and test alert
  delivery remain unverified.
- Supabase backup/PITR evidence is now explicitly blocked by current platform
  state: `supabase backups list` reports `pitr_enabled: false` and no listed
  physical backups.

## Vercel Evidence

Project:

- Vercel scope: `james-walshs-projects-5e78c189`
- Project: `complyeur`
- Latest production URL: `https://complyeur.com`
- Node version: `24.x`
- `vercel projects ls` result: project found and updated 2h before capture.

Deployment:

- Command: `vercel inspect complyeur.com`
- Deployment ID: `dpl_4Q39SMeriYnUehW8m6TqPX2RtwtX`
- Deployment URL:
  `https://complyeur-98esvc84t-james-walshs-projects-5e78c189.vercel.app`
- Target: `production`
- Status: `Ready`
- Created: Tue Jun 16 2026 17:29:09 BST
- Aliases:
  - `https://complyeur.com`
  - `https://www.complyeur.com`
  - `https://complyeur.vercel.app`
  - `https://complyeur-james-walshs-projects-5e78c189.vercel.app`
  - `https://complyeur-git-main-james-walshs-projects-5e78c189.vercel.app`

Recent deployments:

- `vercel list` showed the latest production deployment as `Ready`.
- One preview deployment from the prior 24h was `Error`; the current production
  deployment was not affected.

Production environment variables:

- Command: `vercel env ls production`
- Result: expected production secrets and public config exist as encrypted Vercel
  values. Values were not printed.
- Confirmed names include:
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_ORG`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_SECRET_KEY`
  - `RESEND_API_KEY`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`

TLS and public health:

- Command: `curl -sS -v -o /dev/null https://complyeur.com/api/health`
- TLS: `TLSv1.3`
- Certificate subject: `CN=complyeur.com`
- Certificate issuer: Let's Encrypt `R13`
- Certificate validity: 2026-05-24 to 2026-08-22
- Certificate host match: `complyeur.com`
- Certificate verification: `SSL certificate verify ok`
- HTTP status: `200`
- Public health body from `curl -sS https://complyeur.com/api/health`:
  `{"status":"ok"}`
- Relevant response headers:
  - `server: Vercel`
  - `cache-control: no-store`
  - `strict-transport-security: max-age=63072000; includeSubDomains; preload`
  - `x-frame-options: DENY`
  - `x-content-type-options: nosniff`

Protected internal health:

- Command pattern:
  `source .env.production.sync` then call `/api/internal/health` with
  `Authorization: Bearer $CRON_SECRET`
- Secret value was not printed.
- Result:
  `{"status":"ok","checks":{"ping":"ok"}}`

## Supabase Evidence

Screenshot evidence:

- `2026-06-16-supabase-leaked-password-protection-plan-blocked.png`

Production project:

- Project ID/ref: `bewydxxynjtfpytunlcq`
- Name: `complyeur-prod`
- Region: `eu-west-2`
- Status: `ACTIVE_HEALTHY`
- Database host: `db.bewydxxynjtfpytunlcq.supabase.co`
- PostgreSQL engine: `17`
- Database version: `17.6.1.063`
- Release channel: `ga`
- API URL: `https://bewydxxynjtfpytunlcq.supabase.co`

Environment inventory:

- Additional projects visible:
  - `complyeur-staging` (`erojhukkihzxksbnjoix`) status `INACTIVE`
  - `complyeur-dev` (`ympwgavzlvyklkucskcj`) status `INACTIVE`

Migrations:

- `list_migrations` returned 34 applied migrations.
- Latest applied migration:
  `20260529110000_add_employee_anonymized_by`

Edge Functions:

- `auth-hook-prevent-linking`
- Status: `ACTIVE`
- Version: 4
- `verify_jwt`: true

RLS table summary:

- `list_tables` checked `public` and `storage` schemas.
- All returned `public` and `storage` tables had `rls_enabled: true`.
- Tables with live row counts included:
  - `public.companies`: 2
  - `public.profiles`: 4
  - `public.employees`: 171
  - `public.trips`: 2858
  - `public.audit_log`: 30
  - `public.import_sessions`: 5
  - `public.stripe_webhook_events`: 3
  - `storage.buckets`: 1
- Row counts were captured only as aggregate operational evidence; no row data
  or customer records were read.

Security advisors:

- Security advisor returned one warning:
  - `auth_leaked_password_protection`: leaked password protection is disabled.
  - Level: `WARN`
  - Remediation:
    https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Repo-side mitigation completed after this finding:
  - `supabase/config.toml` now uses
    `minimum_password_length = 12`.
  - `supabase/config.toml` now uses
    `password_requirements = "lower_upper_letters_digits_symbols"`.
  - App signup, reset, and account password-change validation now requires at
    least 12 characters and at least one uppercase letter, lowercase letter,
    number, and symbol.
  - Targeted validation tests passed: 5 files, 96 tests.
- Hosted leaked password protection remains disabled in Supabase and still
  requires a Pro-or-higher Supabase plan or explicit risk acceptance.
- Dashboard screenshot result: the attempted hosted toggle failed with:
  `Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up.`

Performance advisors:

- Performance advisor returned INFO/WARN lints, including:
  - Unindexed foreign keys on selected audit, alert, background job, column
    mapping, invite, snapshot, employee, and trip relationships.
  - RLS init-plan warnings on MFA backup code/session policies.
  - Unused-index notices on several beta-low-traffic tables.
  - Duplicate-index warnings on `companies`, `company_entitlements`, and
    `employees`.
- These are performance and hygiene follow-ups, not evidence of an immediate
  tenant-isolation failure.

Backup/PITR:

- Command: `supabase backups list --project-ref bewydxxynjtfpytunlcq -o json`
- Result:
  - `pitr_enabled: false`
  - `walg_enabled: true`
  - `region: eu-west-2`
  - `backups: []`
  - `physical_backup_data: {}`
- The backup/PITR dashboard verification and isolated restore drill remain
  blocked until backups/PITR are enabled.
- 2026-06-16 risk acceptance for the initial private tester group is recorded in
  `docs/operations/evidence/release-approvals/2026-06-16-no-pitr-initial-tester-risk-acceptance.md`.

## Sentry Evidence

Configuration presence:

- Vercel production environment variables include:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`

Read API attempts:

- Command pattern:
  `python3 sentry_api.py --org "$SENTRY_ORG" --project "$SENTRY_PROJECT" list-issues --environment production --time-range 24h --limit 20 --query "is:unresolved"`
- Token value was not printed.
- Initial production-token result:
  `HTTP 403 ... {"detail":"You do not have permission to perform this action."}`
- Follow-up with a newly created read-capable personal token:
  `[]`
- Evidence:
  `docs/operations/evidence/sentry-alerts/2026-06-16-sentry-production-issues-api-check.md`

Conclusion:

- Sentry runtime/build configuration is present.
- Live Sentry project issue access is verified for the production issues query.
- Live alert rules, notification recipients, and test alert delivery are still
  not verified.
- This remains a private-beta blocker until dashboard screenshots or API
  evidence prove alert routing to a responsible recipient.

## Follow-Up

Required before marking all platform dashboard evidence complete:

1. Upgrade/confirm the Supabase project is on a Pro-or-higher plan and enable
   leaked password protection in hosted Auth settings, or document explicit risk
   acceptance. Repo-side password requirements have been hardened to minimum 12
   characters plus symbols, but the hosted advisor warning remains.
2. Enable Supabase backup/PITR coverage, then complete the documented isolated
   restore drill before broader rollout, paid beta, or public beta. A scoped
   no-PITR risk acceptance exists only for the initial private tester group.
3. Capture Sentry dashboard screenshots or API evidence for alert rules,
   notification routing, recipients, and test alert delivery.
4. Triage Supabase performance advisor warnings after private-beta blockers are
   closed.
