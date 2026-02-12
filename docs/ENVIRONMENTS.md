# ComplyEur Environment Setup

## Overview

ComplyEur operates with two active runtime environments:

| Runtime Environment | Vercel Environment | Purpose |
|---|---|---|
| Production | Production | Live customer-facing application |
| Test/Preview | Preview | Development, QA, and branch previews |

This matches the canonical architecture in `docs/architecture/ENVIRONMENTS.md`.

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
```

---

## Security Notes

- Never commit `.env.*` files.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must never be exposed client-side.
- Keep production and test credentials fully separate.
- Verify target environment before running migrations or destructive scripts.

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
