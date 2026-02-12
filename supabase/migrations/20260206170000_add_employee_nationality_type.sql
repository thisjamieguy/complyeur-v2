-- Add missing nationality_type column used by compliance logic.
-- This aligns the database schema with application queries in lib/data/employees.ts.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nationality_type text;

-- Backfill existing rows before enforcing NOT NULL.
UPDATE public.employees
SET nationality_type = 'uk_citizen'
WHERE nationality_type IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN nationality_type SET DEFAULT 'uk_citizen',
  ALTER COLUMN nationality_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_nationality_type_check'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_nationality_type_check
      CHECK (nationality_type IN ('uk_citizen', 'eu_schengen_citizen', 'rest_of_world'));
  END IF;
END $$;

COMMENT ON COLUMN public.employees.nationality_type IS
  'Employee nationality category used for 90/180 compliance exemptions';
