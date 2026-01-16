# ComplyEUR Multi-Environment Setup

## Overview

ComplyEUR uses three separate Supabase projects for complete environment isolation.

| Environment | Project Name | Region | Status | Purpose |
|-------------|--------------|--------|--------|---------|
| Development | complyeur-dev | Frankfurt (eu-central-1) | Active | Local development and testing |
| Staging | complyeur-staging | Frankfurt (eu-central-1) | Inactive | Pre-production testing (activate when needed) |
| Production | complyeur-prod | London (eu-west-2) | Active | Live customer-facing application |

---

## Project Details

### Development (complyeur-dev)

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ympwgavzlvyklkucskcj
- **Project URL:** https://ympwgavzlvyklkucskcj.supabase.co
- **Region:** Frankfurt (eu-central-1)
- **Environment File:** `.env.local`
- **Purpose:** Local development, feature testing, debugging

### Staging (complyeur-staging)

- **Supabase Dashboard:** https://supabase.com/dashboard/project/erojhukkihzxksbnjoix
- **Project URL:** https://erojhukkihzxksbnjoix.supabase.co
- **Region:** Frankfurt (eu-central-1)
- **Environment File:** `.env.staging`
- **Status:** Currently INACTIVE - restore via dashboard before use
- **Purpose:** Pre-production validation, QA testing, client demos

### Production (complyeur-prod)

- **Supabase Dashboard:** https://supabase.com/dashboard/project/bewydxxynjtfpytunlcq
- **Project URL:** https://bewydxxynjtfpytunlcq.supabase.co
- **Region:** London (eu-west-2)
- **Environment File:** `.env.production`
- **Purpose:** Live customer data, production workloads

---

## Environment Files

All environment files are gitignored for security. Each contains:

```
NEXT_PUBLIC_SUPABASE_URL      - Public API endpoint
NEXT_PUBLIC_SUPABASE_ANON_KEY - Public anonymous key (safe for frontend)
SUPABASE_SERVICE_ROLE_KEY     - Private service key (server-side only!)
SUPABASE_DB_PASSWORD          - Database password (for direct connections)
NEXT_PUBLIC_APP_URL           - Application base URL
UPSTASH_REDIS_REST_URL        - Redis URL for rate limiting
UPSTASH_REDIS_REST_TOKEN      - Redis auth token
```

---

## Vercel Deployment

Configure environment variables in Vercel for each deployment environment:

1. **Preview deployments** → Use staging credentials
2. **Production deployment** → Use production credentials

Set variables in: Vercel Dashboard > Project > Settings > Environment Variables

---

## Security Notes

- Never commit `.env.*` files (already in `.gitignore`)
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - never expose in frontend
- Each environment has isolated data - no cross-contamination
- Production uses a different region for disaster awareness

---

## Legacy Project

The original `complyeur-v2` project still exists but is INACTIVE. It can be deleted once you confirm all data has been migrated to the new dev environment.

- **Reference ID:** sheqtawytsidyhzpzefk
- **Region:** London (eu-west-2)
- **Status:** INACTIVE
