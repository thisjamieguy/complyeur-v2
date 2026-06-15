# ComplyEur Deployment Runbook

## Status

**Supporting operational document.**

- Current beta release decision owner:
  `docs/release/BETA_RELEASE_SOURCE_OF_TRUTH.md`
- Canonical environment policy:
  `docs/architecture/ENVIRONMENTS.md`
- Canonical migration workflow:
  `docs/architecture/MIGRATION_WORKFLOW.md`
- Production safety rules:
  `docs/architecture/PRODUCTION_SAFETY_RAILS.md`

Use this document for deploy, rollback, recovery, logs, and operational
execution. If this document conflicts with the architecture or migration docs
above, the architecture docs win.

This document contains operational procedures for deploying, monitoring, and maintaining ComplyEur in production.

---

## Table of Contents
1. [How to Deploy](#how-to-deploy)
2. [How to Rollback](#how-to-rollback)
3. [How to Run Database Migrations](#how-to-run-database-migrations)
4. [Availability Targets (RTO/RPO)](#availability-targets-rtorpo)
5. [Backup Restore Testing](#backup-restore-testing)
6. [How to Check Logs](#how-to-check-logs)
7. [Health Checks](#health-checks)
8. [Rate Limits and Cron Endpoints](#rate-limits-and-cron-endpoints)
9. [Vendor Outage Runbooks](#vendor-outage-runbooks)
10. [How to Enable Maintenance Mode](#how-to-enable-maintenance-mode)
11. [Emergency Contacts](#emergency-contacts)
12. [First 24 Hours After Launch](#first-24-hours-after-launch)

---

## How to Deploy

### Automatic Deployment (Recommended)
1. Push your changes to the `main` branch
2. Vercel automatically builds and deploys
3. Monitor the deployment at [Vercel Dashboard](https://vercel.com/dashboard)
4. Verify the deployment at https://complyeur.com

```bash
git add .
git commit -m "feat: your change description"
git push origin main
```

### Manual Deployment
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the ComplyEur project
3. Click **Deployments** tab
4. Click **...** on the latest deployment
5. Select **Redeploy**

### Preview Deployments
- All non-main branches get preview URLs automatically
- Test changes on preview URL before merging to main
- Find preview URLs in the Vercel dashboard or GitHub PR comments

---

## How to Rollback

If a deployment causes issues, rollback to a previous version:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → ComplyEur project
2. Click **Deployments** tab
3. Find the last working deployment (look at timestamps and commit messages)
4. Click **...** on that deployment
5. Select **Promote to Production**
6. Confirm the rollback

The previous deployment will be instantly live. No rebuild required.

---

## How to Run Database Migrations

### Canonical Workflow

Follow `docs/architecture/MIGRATION_WORKFLOW.md` for the authoritative
repository workflow.

In particular:

- Create schema changes as migration files in `supabase/migrations/`
- Validate on the active Test/Preview environment first
- Do not manually patch production schema through the Supabase SQL editor as a
  normal deployment path
- Use the two-environment model from `docs/architecture/ENVIRONMENTS.md`

### Dashboard SQL Editor Use

The Supabase SQL editor is an emergency or explicitly approved maintenance
tool, not the standard migration workflow.

If a production incident or approved maintenance task requires dashboard SQL:

1. Confirm the reason cannot be handled through the normal migration workflow.
2. Record the incident or maintenance context.
3. Verify the target project is the intended environment.
4. Save the SQL in a repository migration or incident record immediately after
   execution so the repo remains the source of truth.

### Best Practices
- Always validate migrations in the active Test/Preview environment first
- Run migrations during low-traffic periods
- Keep a backup before major schema changes
- Document all migrations in `/supabase/migrations/`
- Follow `docs/architecture/PRODUCTION_SAFETY_RAILS.md` for any production-risk
  operation

### Common Migration Commands
```sql
-- Check table structure
\d tablename

-- List all tables
\dt

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

---

## Availability Targets (RTO/RPO)

### Recovery Time Objective (RTO)
- **Target RTO:** 8 hours
- **Definition:** Maximum acceptable time to restore production service after a full outage.

### Recovery Point Objective (RPO)
- **Target RPO:** 24 hours
- **Definition:** Maximum acceptable data loss based on backup cadence.

### Backup Assumptions
- Supabase managed Postgres with daily automated backups.
- Point-in-time recovery (PITR) is used when available for finer restore points.
- Vercel is stateless and can redeploy quickly after code-level incidents.
- DSAR exports are stored in Supabase Storage and treated as sensitive data.

---

## Backup Restore Testing

### Procedure (Quarterly or After Major Data Changes)
1. Identify restore point (timestamp or daily backup).
2. Request restore via Supabase dashboard (PITR or backup restore).
3. Restore into an isolated project or approved restore target (avoid
   overwriting production).
4. Validate critical data integrity:
   - `companies`, `profiles`, `employees`, `trips`
   - `audit_log`, `admin_audit_log`
5. Validate auth and app behavior:
   - one known test user can authenticate
   - dashboard shell loads
   - one employee/trip smoke flow works
   - RLS prevents a tenant-A user reading tenant-B rows
6. Record evidence (see below) and store in the compliance evidence folder.

### Evidence Expectations
- Date/time of test
- Restore point or backup ID
- Person executing the test
- Target environment/project
- Validation queries and results
- Screenshots of Supabase restore confirmation
- Sign-off from reviewer
- Row-count comparison for critical tables
- RLS validation result
- Auth smoke-test result
- App smoke-test result

### Data Corruption Recovery Procedure

Use this flow for suspected production data corruption, accidental destructive
changes, or a release that causes integrity concerns.

#### Trigger Conditions
- Multiple user reports of missing or incorrect employee/trip data
- Unexpected spikes in failed writes after a deploy
- Discovery of bad writes, duplicate rows, or broken relationships
- Any concern that tenant scoping or RLS behavior may be compromised

#### Immediate Containment
1. Assign an incident commander and start an incident timeline.
2. Enable maintenance mode with `NEXT_PUBLIC_MAINTENANCE_MODE=true` if
   continued writes may worsen the issue.
3. Stop non-essential cron jobs and bulk admin operations until scope is known.
4. Preserve evidence before making fixes:
   - Vercel deploy ID and commit SHA
   - Supabase project and current migration version
   - relevant Sentry issue URLs
   - Supabase auth, API, and database logs

#### Recovery Decision
Choose one path and record the rationale:

- **Targeted repair** for a narrow issue with verified row scope and a safe fix.
- **Restore into isolated project** when data integrity is broadly in doubt or
  a point-in-time inspection is needed.
- **Deploy rollback plus data repair** when the release caused bad writes but
  the pre-incident dataset is still recoverable.

Do not restore directly over production until the isolated restore has been
validated and the incident owner approves the cutover plan.

#### Restore Validation Checklist
Run these checks against the restored copy before any cutover decision:
1. Confirm critical tables are present and row counts are plausible:
   - `companies`
   - `profiles`
   - `employees`
   - `trips`
   - `alerts`
   - `notification_log`
   - `audit_log`
2. Verify a sample of affected customer records matches the expected
   pre-incident state.
3. Re-run a smoke pass of the highest-risk workflows:
   - login
   - dashboard load
   - add employee
   - add trip
   - compliance recalculation
   - export flow
4. Re-validate tenant isolation:
   - confirm RLS is enabled on tenant-scoped tables
   - run the current cross-tenant attack-test checklist or equivalent probes
   - confirm tenant-A requests for tenant-B records fail with the expected
     non-disclosing responses
5. Review migrations and feature flags to ensure the restore target is
   compatible with the app version intended after recovery.

#### Production Re-entry
1. Decide whether to promote the restore target, repair production in place, or
   replay corrected rows only.
2. Pair one engineering reviewer with the executor for the final production
   step.
3. After recovery, re-run:
   - `GET /api/health`
   - auth smoke flow
   - employee/trip create flow
   - one export flow
4. Keep maintenance mode enabled until the above checks pass.
5. Capture the final outcome, residual risk, and any customer follow-up actions
   in the incident record.

#### Minimum Evidence To Store
- Incident start and containment timestamps
- Restore point timestamp or backup identifier
- Name of executor and reviewer
- Validation queries or screenshots
- RLS re-check evidence
- Final production cutover decision
- Customer/regulatory communication decision if personal data was impacted

---

## How to Check Logs

### Vercel Runtime Logs
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → ComplyEur
2. Click **Logs** tab
3. Filter by:
   - **Level**: Error, Warning, Info
   - **Source**: Edge, Serverless, Static
   - **Time Range**: Last hour, Last 24h, etc.

### Supabase Logs
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select `complyeur-prod` project
3. Click **Logs** in sidebar
4. Choose log type:
   - **API Logs**: REST API requests
   - **Auth Logs**: Login/signup activity
   - **Database Logs**: PostgreSQL queries
   - **Realtime Logs**: Subscription activity

### Sentry Error Tracking
1. Go to [Sentry Dashboard](https://sentry.io)
2. Select ComplyEur project
3. View **Issues** for grouped errors
4. Check **Performance** for slow transactions

### What to look for after March 2026 hardening
- `429` responses on interactive mutation routes if users are retrying too aggressively
- `503` responses if the production rate limiter is unavailable and fail-closed protection is active
- Generic cron API failures such as `Failed to process onboarding emails` or `Failed to process renewal emails`; details are intentionally kept in logs, not the HTTP body

High-signal routes:
- `/api/billing/checkout`
- `/api/billing/portal`
- `/api/billing/status`
- `/api/health`
- `/api/internal/health`
- `/api/cron/billing`
- `/api/cron/onboarding`
- server actions behind Team, GDPR, Import, Onboarding, and Admin company detail pages

---

## Health Checks

### Public Health

`GET /api/health` is the external uptime endpoint. It intentionally uses the
anonymous Supabase client and only calls `ping()`. It must not use the service
role key or expose vendor diagnostics.

Expected healthy response:

```json
{ "status": "ok" }
```

Expected failed response:

```json
{ "status": "error" }
```

### Internal Deep Health

`GET /api/internal/health` and `POST /api/internal/health` are protected by
`CRON_SECRET`. Use them for scheduled or operator-only checks that may need
service-role database probing.

Required header:

```text
Authorization: Bearer ${CRON_SECRET}
```

Store uptime evidence under `docs/operations/evidence/` or
`docs/compliance/soc2/evidence/` with the date, monitored URL, response code,
response body, alert recipient, and test-alert result.

---

## Rate Limits and Cron Endpoints

### Protected routes and actions

The app now applies centralized server-side rate limiting to:
- billing checkout, billing portal, and billing status routes
- onboarding actions such as company setup and team invites
- import session reads/writes, saved mapping mutations, and session deletion
- GDPR actions and DSAR-related workflows
- team management and admin company-detail mutations

### Expected production behavior

- Normal limit hit: return `429 Too Many Requests`
- Rate limiter unavailable in production: return `503` and fail closed
- Development without Upstash: local in-memory fallback is used

### Operator response

If users report repeated `Too many requests` or `Rate limit exceeded` errors:
1. Check whether a recent deploy changed client retry behavior.
2. Inspect Vercel and Supabase logs for the affected action name.
3. Confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present in production.
4. Ask the user to retry once after the window resets instead of repeatedly submitting the same form.

### Cron endpoint notes

Cron routes intentionally return generic error messages now:
- `/api/cron/billing`
- `/api/cron/onboarding`

Use runtime logs to get the underlying query or provider failure. Do not rely on the HTTP response body for detailed diagnosis.

---

## Vendor Outage Runbooks

### Supabase

Impact: auth, database reads/writes, RLS-backed APIs, imports, billing
entitlement updates, and DSAR workflows.

1. Check Supabase status and project logs.
2. Confirm whether the incident affects Auth, Postgres, Storage, Edge
   Functions, or all APIs.
3. Enable maintenance banner if writes may fail or data integrity is uncertain.
4. Pause imports, billing lifecycle processing, and bulk data actions if partial
   writes are suspected.
5. After recovery, run public health, internal health, auth smoke, dashboard
   smoke, and tenant-isolation checks.

### Vercel

Impact: app availability, route handlers, server actions, middleware, and
production deployments.

1. Check Vercel status, deployment logs, and recent deployment IDs.
2. If caused by a release, promote the last known good deployment.
3. If platform-wide, post status to support channels and pause non-essential
   deploys.
4. After recovery, record deployment ID, health result, and rollback decision.

### Stripe

Impact: checkout, customer portal, subscription lifecycle updates, and
entitlements.

1. Check Stripe status, webhook endpoint health, and failed events.
2. Pause manual entitlement changes unless a billing owner approves them.
3. Reconcile missed or failed webhook events after recovery.
4. Store endpoint, failed-event, replay, and entitlement reconciliation evidence.

### Resend

Impact: transactional email, invitations, support notifications, and alerts
sent through email.

1. Check Resend status, delivery logs, and domain authentication.
2. Identify affected templates and users.
3. Queue resend/retry only when duplicate delivery risk is understood.
4. Store delivery evidence for auth, invite, password reset, and alert emails.

### Sentry

Impact: error alerting, issue grouping, release visibility, and production
diagnostics.

1. Check Sentry status and organization/project access.
2. Confirm whether ingestion, alert routing, or dashboard access is affected.
3. Fall back to Vercel/Supabase/Stripe logs while Sentry is impaired.
4. Fire a test alert after recovery and store routing evidence.

### Upstash

Impact: rate limiting and any Redis-backed abuse controls.

1. Check Upstash status and REST token/env configuration.
2. In production, rate limiter unavailability may fail closed with `503`.
3. Review recent `429` and `503` spikes.
4. Do not disable rate limiting without an incident commander decision.

---

## How to Enable Maintenance Mode

Maintenance mode shows a banner to users without taking the site offline.

### Enable Maintenance Mode
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → ComplyEur → **Settings** → **Environment Variables**
2. Add variable:
   - Name: `NEXT_PUBLIC_MAINTENANCE_MODE`
   - Value: `true`
   - Environment: Production
3. Redeploy the application

### Disable Maintenance Mode
1. Remove or set `NEXT_PUBLIC_MAINTENANCE_MODE` to `false`
2. Redeploy the application

---

## Emergency Contacts

### Platform Support
| Service | Support URL | Response Time |
|---------|-------------|---------------|
| Vercel | https://vercel.com/support | Priority for Pro |
| Supabase | https://supabase.com/support | Priority for Pro |
| Resend | https://resend.com/support | 24-48 hours |
| Sentry | https://sentry.io/support | Varies by plan |

### Status Pages
- Vercel: https://www.vercel-status.com
- Supabase: https://status.supabase.com
- Resend: https://status.resend.com

---

## First 24 Hours After Launch

### Hour 0-1 (Immediate Post-Launch)
- [ ] Verify site is accessible at https://complyeur.com
- [ ] Test signup flow end-to-end with a test email
- [ ] Test login flow with the test account
- [ ] Check Sentry dashboard for any immediate errors
- [ ] Check Supabase logs for unusual activity
- [ ] Verify health check endpoint: `GET /api/health`

### Every 2 Hours (First 12 Hours)
- [ ] Check uptime monitor status (should be green)
- [ ] Check support email inbox for user issues
- [ ] Review Sentry for new errors
- [ ] Check GA4 for traffic patterns
- [ ] Spot-check one core feature (add employee, add trip, etc.)
- [ ] Check for unexpected spikes in `429` or `503` responses on billing, onboarding, and import flows

### Hour 12-24
- [ ] Review total signups: `SELECT COUNT(*) FROM companies WHERE created_at > NOW() - INTERVAL '24 hours';`
- [ ] Review any support emails and categorize issues
- [ ] Check error rate trend in Sentry
- [ ] Verify daily backup ran successfully in Supabase
- [ ] Review performance metrics in Vercel Analytics

### Red Flags (Act Immediately)
- Error rate >5% in Sentry
- Site down for >5 minutes
- >3 support emails about the same issue
- Any data-related complaints (missing data, wrong data)
- Auth/login failures reported by users
- Health check returning 503

### Success Indicators
- Zero critical errors in Sentry
- <3 support emails in first 24h
- At least 1 successful signup
- All monitoring systems showing green
- Health check consistently returning 200
- No user-reported data issues

### Quick Health Checks
```bash
# Check health endpoint
curl -s https://complyeur.com/api/health | jq

# Expected response:
# { "status": "ok" }
```

---

## Appendix: Useful Commands

### Git Operations
```bash
# Tag a release
git tag -a v2.0.0 -m "MVP Launch"
git push origin v2.0.0

# Checkout a specific tag
git checkout v2.0.0

# View recent commits
git log --oneline -10
```

### Supabase CLI
```bash
# Generate TypeScript types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

# Link to project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
npx supabase db push
```

### Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod

# List deployments
vercel ls
```
