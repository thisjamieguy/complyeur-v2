# ComplyEur Migration Workflow

This document defines how database schema changes move from development to production. Every migration must follow this workflow without exception.

Schema changes that bypass this workflow are forbidden.

---

## Overview

Database migrations in ComplyEur follow a strict promotion path:

```
Developer creates migration
        ↓
Migration applied to Test database
        ↓
Migration validated in Test environment
        ↓
Migration approved for production
        ↓
Migration applied to Production database
```

No migration reaches production without first succeeding in test. No migration is applied to production without explicit approval.

---

## Migration Creation

### Where Migrations Live

All migrations are stored in the codebase:

```
/supabase/migrations/
  20240115120000_create_employees_table.sql
  20240116090000_add_passport_number.sql
  20240117140000_create_trips_table.sql
```

### Naming Convention

Migrations are named with a timestamp prefix and descriptive suffix:

```
YYYYMMDDHHMMSS_description_of_change.sql
```

Examples:
- `20250114100000_add_company_subscription_tier.sql`
- `20250114110000_create_audit_log_table.sql`
- `20250114120000_add_index_on_trips_employee_id.sql`

### Creating a New Migration

1. Generate a new migration file using the Supabase CLI:
   ```bash
   npx supabase migration new description_of_change
   ```

2. Write the SQL for the schema change in the generated file

3. Include both the forward migration and document rollback steps in comments

4. Commit the migration file to your feature branch

### Migration File Structure

Every migration file must follow this structure:

```sql
-- Migration: description_of_change
-- Created: YYYY-MM-DD
-- Author: [developer name or identifier]

-- Purpose:
-- [Explain what this migration does and why it is needed]

-- Rollback:
-- [Document the SQL needed to reverse this migration]

-- Forward Migration
[SQL statements here]
```

---

## Migration Application Order

### Step 1: Apply to Test Database First

Every migration is first applied to the Test Supabase project. This happens:

- Automatically when pushing to a feature branch (via Supabase CLI in CI, if configured)
- Manually by running `npx supabase db push` against the Test project

**Test database connection must be verified before running any migration command.**

### Step 2: Validate in Test Environment

After applying a migration to test, validation must occur:

1. **Schema verification**: Confirm the expected tables, columns, and constraints exist
2. **Application testing**: Deploy the corresponding code to a preview environment and verify functionality
3. **Data integrity check**: If the migration transforms data, verify the transformation is correct
4. **Rollback verification**: Confirm the documented rollback procedure works

A migration is not validated until all four checks pass.

### Step 3: Approve for Production

Before a migration can be applied to production, it must receive explicit approval. Approval requires:

- Test validation is complete
- The migration has been reviewed for safety (no destructive operations without safeguards)
- The migration is associated with a merged PR to `main`

### Step 4: Apply to Production Database

Production migrations are applied only after:

- The code that depends on the migration is ready to deploy
- The migration has been validated in test
- Approval is documented

Production migration execution:

```bash
# Verify you are targeting production
npx supabase db push --project-ref [PRODUCTION_PROJECT_REF]
```

**Double-check the project reference before executing.**

---

## Validation Requirements

A migration is considered "validated" when all of the following are true:

### Schema Validation

- [ ] Expected tables exist with correct names
- [ ] Expected columns exist with correct types
- [ ] Expected constraints (NOT NULL, UNIQUE, FOREIGN KEY) are in place
- [ ] Expected indexes exist
- [ ] RLS policies are enabled on new tables

### Application Validation

- [ ] Application code runs without errors against the new schema
- [ ] All affected features work correctly in preview deployment
- [ ] No unexpected errors in browser console or server logs

### Data Validation

- [ ] Existing data is not corrupted by the migration
- [ ] Data transformations produce expected results
- [ ] No orphaned records or broken relationships

### Rollback Validation

- [ ] Rollback SQL has been tested in test environment
- [ ] Rollback restores previous schema state
- [ ] Rollback does not cause data loss beyond the migration's changes

---

## What "Safe to Promote" Means

A migration is safe to promote to production when:

1. **It has been applied to test without errors**
2. **It has been validated using the checklist above**
3. **It does not contain destructive operations without safeguards**
4. **It is associated with reviewed and merged code**
5. **It has been explicitly approved for production**

A migration is NOT safe to promote if:

- It has only been tested locally
- It contains `DROP TABLE`, `TRUNCATE`, or `DELETE` without explicit approval
- It has not been associated with a code review
- The rollback procedure has not been documented and tested

---

## Rollback Expectations

### Every Migration Must Be Reversible

When creating a migration, document the rollback procedure in the migration file itself. For most migrations, this means:

| Forward Operation | Rollback Operation |
|-------------------|-------------------|
| `CREATE TABLE x` | `DROP TABLE x` |
| `ALTER TABLE ADD COLUMN` | `ALTER TABLE DROP COLUMN` |
| `CREATE INDEX` | `DROP INDEX` |
| `INSERT` (seed data) | `DELETE` (with WHERE clause) |

### Rollback Testing Is Mandatory

Before a migration is considered validated, its rollback must be tested:

1. Apply the migration to test
2. Verify it works
3. Apply the rollback
4. Verify the schema returns to its previous state
5. Re-apply the migration

This confirms both directions work.

### Data-Destructive Rollbacks

Some rollbacks cannot preserve data (e.g., dropping a column deletes its data). For these migrations:

- Document explicitly that the rollback is data-destructive
- Consider whether the migration should be split into smaller steps
- Ensure production backups are current before applying

---

## Handling Migration Failures

### Failure in Test

If a migration fails in test:

1. Do not attempt to force it
2. Investigate the root cause
3. Fix the migration SQL
4. Reset the test database if needed (`npx supabase db reset` against test only)
5. Re-apply the corrected migration

### Failure in Production

If a migration fails in production:

1. **Stop immediately** — do not retry without investigation
2. Assess whether the database is in a partial state
3. Determine if rollback is needed or if a forward fix is safer
4. Execute the chosen recovery path
5. Document the incident

Production migration failures are incidents. They require post-mortems.

---

## Prohibited Practices

The following are forbidden in migration workflows:

### No Direct Production SQL

Migrations are never applied by running raw SQL directly in the Supabase dashboard against production. All production schema changes go through the migration system.

### No Skipping Test

A migration that has not been applied to test first cannot be applied to production. There are no exceptions for "simple" changes.

### No Undocumented Rollbacks

Every migration must have its rollback documented. A migration without a documented rollback is incomplete.

### No Silent Data Modifications

Migrations that modify existing data (UPDATE, DELETE) must:
- Be explicitly flagged as data-modifying
- Include verification queries to confirm the modification is correct
- Be applied during low-traffic windows when possible

---

## Migration Checklist

Use this checklist before promoting any migration to production:

### Before Creating

- [ ] Is a schema change actually needed?
- [ ] Is this the minimal change required?
- [ ] Have existing patterns in the codebase been followed?

### Before Applying to Test

- [ ] Migration file is correctly named
- [ ] Migration file includes purpose documentation
- [ ] Migration file includes rollback documentation
- [ ] Migration file is committed to the feature branch

### Before Approving for Production

- [ ] Migration succeeded in test without errors
- [ ] Schema validation checklist passed
- [ ] Application validation checklist passed
- [ ] Rollback has been tested
- [ ] Code changes are merged to main
- [ ] Approval is documented

### Before Applying to Production

- [ ] Verified targeting the correct Supabase project
- [ ] Backup is current (Supabase point-in-time recovery enabled)
- [ ] Deployment window is appropriate (not during peak traffic)
- [ ] Rollback plan is ready if needed

---

## Change Log

This document is canonical. Changes require explicit review and approval.

| Date | Change | Approved By |
|------|--------|-------------|
| 2025-01-14 | Initial version | Architecture review |
