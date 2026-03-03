# ComplyEur Deployment Runbook

This document contains operational procedures for deploying, monitoring, and maintaining ComplyEur in production.

---

## Table of Contents
1. [How to Deploy](#how-to-deploy)
2. [How to Rollback](#how-to-rollback)
3. [How to Run Database Migrations](#how-to-run-database-migrations)
4. [Availability Targets (RTO/RPO)](#availability-targets-rtorpo)
5. [Backup Restore Testing](#backup-restore-testing)
6. [How to Check Logs](#how-to-check-logs)
7. [Rate Limits and Cron Endpoints](#rate-limits-and-cron-endpoints)
8. [How to Enable Maintenance Mode](#how-to-enable-maintenance-mode)
9. [Emergency Contacts](#emergency-contacts)
10. [First 24 Hours After Launch](#first-24-hours-after-launch)

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

### From Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select the `complyeur-prod` project
3. Click **SQL Editor** in the sidebar
4. Paste your migration SQL
5. Click **Run** to execute
6. Verify with a `SELECT` query

### Best Practices
- Always test migrations on staging first
- Run migrations during low-traffic periods
- Keep a backup before major schema changes
- Document all migrations in `/supabase/migrations/`

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
3. Restore into a staging or isolated project (avoid overwriting production).
4. Validate critical data integrity:
   - `companies`, `profiles`, `employees`, `trips`
   - `audit_log`, `admin_audit_log`
5. Record evidence (see below) and store in the compliance evidence folder.

### Evidence Expectations
- Date/time of test
- Restore point or backup ID
- Person executing the test
- Target environment/project
- Validation queries and results
- Screenshots of Supabase restore confirmation
- Sign-off from reviewer

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
- `/api/cron/billing`
- `/api/cron/onboarding`
- server actions behind Team, GDPR, Import, Onboarding, and Admin company detail pages

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
# {
#   "status": "healthy",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "database": "connected",
#   "responseTime": "50ms"
# }
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
