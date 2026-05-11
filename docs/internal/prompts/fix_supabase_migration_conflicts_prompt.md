# Codex Prompt: Fix Supabase Migration Conflicts (Idempotent + Safe)

## Best Model
Use: GPT-5.5 / Codex High Reasoning

## Goal
Fix failing Supabase migrations so they:
- run without errors
- are idempotent (safe to run multiple times)
- do NOT break existing data or foreign key dependencies

## Context
The project is a Supabase (Postgres) SaaS app.

Current issues:
1. Duplicate event trigger:
   rls_auto_enable_trigger already exists

2. Duplicate constraint:
   employees_id_company_id_unique already exists
   but cannot be dropped because foreign keys depend on it

3. Migration order mismatch between local and remote

## Critical Rules (DO NOT VIOLATE)
- NEVER drop constraints with CASCADE
- NEVER remove foreign keys
- NEVER modify production data
- ONLY make migrations safe and repeatable
- KEEP tenant isolation guarantees intact
- DO NOT weaken RLS or security logic

## Required Fix Strategy

### 1. Make migrations idempotent

For EVERY migration:

#### Triggers
Replace:
CREATE EVENT TRIGGER ...

With:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_event_trigger
    WHERE evtname = 'rls_auto_enable_trigger'
  ) THEN
    CREATE EVENT TRIGGER rls_auto_enable_trigger
      ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE')
      EXECUTE FUNCTION public.rls_auto_enable();
  END IF;
END
$$;

---

#### Constraints (IMPORTANT)

Replace:
ALTER TABLE public.employees
ADD CONSTRAINT employees_id_company_id_unique UNIQUE (id, company_id);

With:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_id_company_id_unique'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_id_company_id_unique UNIQUE (id, company_id);
  END IF;
END
$$;

---

### 2. DO NOT drop existing constraints

- Do NOT use DROP CONSTRAINT CASCADE
- Preserve all FK relationships
- Assume existing constraint is correct

---

### 3. Fix ALL migrations that can fail when re-run

Search for:
- CREATE EVENT TRIGGER
- ADD CONSTRAINT
- CREATE INDEX
- CREATE POLICY
- CREATE FUNCTION
- CREATE TRIGGER

Apply:
- IF NOT EXISTS
- DROP ... IF EXISTS (only where safe, NOT constraints with dependencies)
- CREATE OR REPLACE FUNCTION

---

### 4. Ensure security is preserved

Do NOT change:
- RLS policies
- SECURITY DEFINER protections
- auth.uid() checks
- tenant isolation logic

---

### 5. Output required

1. List ALL modified migration files
2. Show BEFORE → AFTER diff for each critical fix
3. Confirm no destructive operations introduced
4. Confirm migrations are now idempotent
5. Confirm safe for production

---

## Acceptance Criteria

- supabase db push --include-all runs without errors
- No duplicate object errors
- No constraint conflicts
- No CASCADE usage
- All migrations safe to run multiple times
- Security model unchanged

## Important

Treat this as production-grade database surgery.

If unsure → DO NOT REMOVE anything.
Prefer "check if exists" over deletion.
