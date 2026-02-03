-- Migration: Fix waitlist RLS policy (security linter warning)
-- Issue: WITH CHECK (true) allows unrestricted inserts
-- Solution: Add meaningful validation in the policy and table constraints

BEGIN;

-- ============================================================================
-- 1. Drop the overly permissive policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow anonymous waitlist insert" ON public.waitlist;

-- ============================================================================
-- 2. Add table-level constraints for defense in depth
-- ============================================================================

-- Email format validation (basic RFC 5321 pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_email_format'
  ) THEN
    ALTER TABLE public.waitlist
    ADD CONSTRAINT waitlist_email_format
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  END IF;
END $$;

-- Limit allowed source values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waitlist_source_values'
  ) THEN
    ALTER TABLE public.waitlist
    ADD CONSTRAINT waitlist_source_values
    CHECK (source IS NULL OR source IN ('landing', 'referral', 'direct', 'demo'));
  END IF;
END $$;

-- ============================================================================
-- 3. Create new policy with proper validation
-- ============================================================================
CREATE POLICY "Allow anonymous waitlist insert with validation"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Email must be provided and follow basic format
    email IS NOT NULL
    AND length(email) >= 5
    AND length(email) <= 255
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    -- Source must be a known value (or default)
    AND (source IS NULL OR source IN ('landing', 'referral', 'direct', 'demo'))
    -- Company name length check (if provided)
    AND (company_name IS NULL OR length(company_name) <= 200)
  );

-- ============================================================================
-- 4. Add comment documenting the policy
-- ============================================================================
COMMENT ON POLICY "Allow anonymous waitlist insert with validation" ON public.waitlist IS
  'Allows public waitlist signups with email format validation and field constraints. Replaces permissive WITH CHECK (true) policy.';

COMMIT;
