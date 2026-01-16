# ComplyEur Environment Architecture

This document defines how ComplyEur environments are structured, separated, and protected. Every deployment, database connection, and operational decision must conform to these rules.

Deviating from this architecture is a bug.

---

## Overview

ComplyEur operates exactly two environments:

1. **Production** — serves real customers, contains real data, generates real revenue
2. **Test/Preview** — serves development, QA, and Vercel preview deployments

Each environment is completely isolated. They share no databases, no credentials, and no data.

---

## Environment Definitions

### Production

**Purpose:** Serve paying customers with maximum reliability and data integrity.

| Property | Value |
|----------|-------|
| Branch | `main` |
| Vercel Environment | Production |
| Supabase Project | Production project (dedicated instance) |
| Database | Production PostgreSQL (isolated) |
| URL | `complyeur.com` (or configured production domain) |

**Characteristics:**
- Contains real customer data subject to GDPR
- Receives only tested, validated schema changes
- Has no seed data, test users, or synthetic records
- Operates under strict access controls

### Test/Preview

**Purpose:** Validate code changes, run QA, and support Vercel preview deployments.

| Property | Value |
|----------|-------|
| Branch | Any branch except `main` |
| Vercel Environment | Preview |
| Supabase Project | Test project (dedicated instance) |
| Database | Test PostgreSQL (isolated) |
| URL | `*.vercel.app` preview URLs |

**Characteristics:**
- Contains only synthetic test data
- Receives schema changes first for validation
- Can be reset, seeded, or wiped without consequence
- Used for all destructive testing operations

---

## Branch to Environment Mapping

```
Branch              →  Vercel Environment  →  Supabase Project  →  Database
─────────────────────────────────────────────────────────────────────────────
main                →  Production          →  Production         →  Production DB
feature/*           →  Preview             →  Test               →  Test DB
fix/*               →  Preview             →  Test               →  Test DB
any other branch    →  Preview             →  Test               →  Test DB
```

There is no staging environment. There is no third database. Preview and Test are the same environment.

---

## Vercel Environment Variable Strategy

Environment variables control which Supabase project each deployment connects to. Vercel manages this automatically based on the deployment type.

### Required Variables (Per Environment)

| Variable | Production Value | Preview Value |
|----------|------------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase URL | Test Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Test anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service key | Test service key |
| `STRIPE_SECRET_KEY` | Production Stripe key | Test Stripe key |
| `STRIPE_WEBHOOK_SECRET` | Production webhook secret | Test webhook secret |

### Configuration Rules

1. **Production variables** are set in Vercel with Environment = "Production" only
2. **Preview variables** are set in Vercel with Environment = "Preview" only
3. **Never use "All Environments"** for any variable that differs between environments
4. **Never hardcode** Supabase URLs or keys in source code

### Verification

Before any deployment, verify:
- Production deployment uses production Supabase URL
- Preview deployment uses test Supabase URL
- No cross-contamination is possible

---

## Absolute Rules

These rules are non-negotiable. Violating them is a critical incident.

### Rule 1: No Production Data in Test

Production customer data must never be copied, exported, or replicated to the test environment. This includes:
- Database dumps
- CSV exports
- Manual record copying
- Anonymized production data

Test data must be synthetic, generated specifically for testing purposes.

### Rule 2: No Test Logic in Production

Code that detects "test mode" and behaves differently must not exist in production paths. There is no runtime test mode. The environments are separated at the infrastructure level.

### Rule 3: No Destructive Operations Target Production

Scripts or operations that delete, truncate, or reset data must:
- Explicitly check the environment before execution
- Fail closed (refuse to run) if environment cannot be confirmed
- Never accept production credentials as input

### Rule 4: No Direct Production Database Access

Day-to-day development never connects to the production database. Production database access is permitted only for:
- Emergency incident response
- Scheduled maintenance with explicit approval
- Read-only analytics queries through designated tools

### Rule 5: No Shared Credentials

Production and test Supabase projects must have completely separate credentials. Reusing keys, passwords, or secrets across environments is forbidden.

---

## Safety Principles

This architecture exists to prevent specific failure modes:

### Preventing Data Loss

Production data represents customer trust and legal obligations. Isolating environments ensures that development mistakes, test resets, or experimental changes cannot destroy production data.

### Preventing Data Leakage

GDPR requires that customer data is protected and not exposed unnecessarily. By forbidding production data in test environments, we eliminate an entire category of compliance risk.

### Preventing Corruption

Schema changes and data migrations can corrupt data if applied incorrectly. By requiring all changes to pass through the test environment first, we catch corruption risks before they reach production.

### Preventing Confusion

When developers are unsure which environment they are working in, mistakes happen. This architecture makes environment identity explicit and verifiable at every level.

---

## Environment Identification

Every part of the system should make its environment identity clear:

### In Application Code

```typescript
// Environment is determined by which Supabase URL is configured
// There is no runtime "mode" switch
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// For logging or debugging only:
const isProduction = supabaseUrl?.includes('your-production-project-ref')
```

### In Supabase Dashboard

Each Supabase project is named to indicate its purpose:
- Production project: `complyeur-production` (or similar clear name)
- Test project: `complyeur-test` (or similar clear name)

### In Vercel Dashboard

Deployments are labeled by environment:
- Production deployments show "Production" badge
- Preview deployments show branch name and "Preview" badge

---

## Verification Checklist

Before any significant operation, verify the environment:

- [ ] Which Supabase project am I connected to?
- [ ] What is the database URL showing in my connection?
- [ ] Is this a production deployment or preview deployment?
- [ ] Am I absolutely certain this is the environment I intend to modify?

If any answer is uncertain, stop and verify before proceeding.

---

## Change Log

This document is canonical. Changes require explicit review and approval.

| Date | Change | Approved By |
|------|--------|-------------|
| 2025-01-14 | Initial version | Architecture review |
