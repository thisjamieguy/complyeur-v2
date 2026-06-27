# ComplyEur Environment Setup

## Status

**Supporting operational reference. Not authoritative.**

- Canonical environment policy lives in `docs/architecture/ENVIRONMENTS.md`.
- Use this file for concrete project references and environment-specific
  operational details that may change over time.
- If this file conflicts with `docs/architecture/ENVIRONMENTS.md`, the
  architecture document wins.

## Overview

ComplyEur operates with two active runtime environments:

| Runtime Environment | Vercel Environment | Purpose |
|---|---|---|
| Production | Production | Live customer-facing application |
| Test/Preview | Preview | Development, QA, and branch previews |

This matches the canonical architecture in `docs/architecture/ENVIRONMENTS.md`.
This document intentionally does not define policy.

---

## Supabase Projects

### Test/Preview project

- **Project Name:** `complyeur-dev`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ympwgavzlvyklkucskcj
- **Project URL:** https://ympwgavzlvyklkucskcj.supabase.co
- **Region:** Frankfurt (eu-central-1)
- **Primary local env file:** `.env.local`
- **Use for:** local development, QA, and all preview deployments

### Production project

- **Project Name:** `complyeur-prod`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/bewydxxynjtfpytunlcq
- **Project URL:** https://bewydxxynjtfpytunlcq.supabase.co
- **Region:** London (eu-west-2)
- **Primary env file for reference:** `.env.production`
- **Use for:** live customer data and production workloads only

---

## Vercel Environment Variable Mapping

Set variables in Vercel Dashboard -> Project -> Settings -> Environment Variables:

1. **Preview deployments** -> Test/Preview Supabase credentials
2. **Production deployment** -> Production Supabase credentials

Do not set cross-environment secrets to "All Environments" when values differ.

---

## Environment Files

Environment files are gitignored for security. Common keys include:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_PASSWORD
NEXT_PUBLIC_APP_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
FEATURE_SAVED_JOBS
```

`FEATURE_SAVED_JOBS` defaults to disabled unless set to `true`. Keep it unset
or set it to `false` for private beta.

---

## Security Notes

- Never commit `.env.*` files.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never be exposed client-side.
- Keep production and test credentials fully separate.
- Verify target environment before running migrations or destructive scripts.

---

## Pushing Migrations

The promotion policy (Local → Test/Preview → Production, validate before promote)
is owned by `docs/architecture/MIGRATION_WORKFLOW.md`. The concrete commands and
connection details below are operational reference.

**Active pipeline: Local → Test/Preview → Production**

| Stage | Purpose | Database |
|-------|---------|----------|
| **Local** | Build & iterate (`supabase start`) | Docker (localhost:54322) |
| **Test/Preview** | Validate with real Supabase infra and Vercel preview deployments | `complyeur-dev` (Frankfurt) |
| **Production** | Live users | `complyeur-prod` (London) |

**Important: Always use port 5432 (session mode pooler).** Port 6543 (transaction mode) does not work for migrations.

**Important: Always pass the password via `SUPABASE_DB_PASSWORD` env var.** Piping to `supabase link` does not reliably store it. Use the format: `SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push ...`

```bash
# 1. Create migration locally
supabase migration new my_change_name

# 2. Test locally (replays all migrations from scratch)
supabase db reset

# 3. Dry run against Test/Preview (check what will be applied)
SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push --dry-run --db-url "postgresql://postgres.ympwgavzlvyklkucskcj:<PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# 4. Push to Test/Preview
SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push --db-url "postgresql://postgres.ympwgavzlvyklkucskcj:<PASSWORD>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"

# 5. Test on preview — only when approved, push to production
SUPABASE_DB_PASSWORD="<PASSWORD>" supabase db push --db-url "postgresql://postgres.bewydxxynjtfpytunlcq:<PASSWORD>@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
```

### Migration Rules
- **Never skip Test/Preview validation** — always test migrations there before production
- **Never manually edit remote schemas** via the SQL Editor for structural changes — use migrations
- **Always dry-run first** (`--dry-run`) before pushing to any remote environment
- **Seed data is local only** — `supabase/seed.sql` runs on `db reset` but NOT on `db push`
- **Database passwords** are in the Supabase dashboard (Settings → Database) — never commit them

---

## Legacy/Inactive Projects

### Staging (inactive)

- **Project Name:** `complyeur-staging`
- **Project URL:** https://erojhukkihzxksbnjoix.supabase.co
- **Status:** Inactive/archived, not part of active runtime flow

### Legacy v2 project (inactive)

- **Reference ID:** `sheqtawytsidyhzpzefk`
- **Status:** Inactive/legacy
- **Note:** Do not use for current deployments or type generation.
