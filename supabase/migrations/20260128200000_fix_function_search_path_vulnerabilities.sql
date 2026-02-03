-- Migration: Fix Function Search Path Mutable vulnerabilities
-- All functions with SECURITY DEFINER must have SET search_path = ''
-- All table/function references must be fully qualified (public.tablename)
--
-- This prevents search_path hijacking attacks where an attacker creates
-- malicious objects in a different schema that get resolved before public.

-- =============================================================================
-- 1. create_company_and_profile (SECURITY DEFINER)
-- The canonical version is the 7-arg signature from cleanup migration
-- =============================================================================

-- Drop legacy overloads that have vulnerable search_path settings
DROP FUNCTION IF EXISTS public.create_company_and_profile(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_company_and_profile(UUID, TEXT, TEXT, TIMESTAMPTZ);

-- Update the canonical 7-arg version with proper search_path
CREATE OR REPLACE FUNCTION public.create_company_and_profile(
  user_id UUID,
  user_email TEXT,
  company_name TEXT,
  user_terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
  user_auth_provider TEXT DEFAULT 'email',
  user_first_name TEXT DEFAULT NULL,
  user_last_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_company_id UUID;
  company_slug TEXT;
BEGIN
  -- Check if profile already exists (idempotency check)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    -- Return existing company_id
    SELECT company_id INTO new_company_id FROM public.profiles WHERE id = user_id;
    RETURN new_company_id;
  END IF;

  -- Generate a slug from company name
  company_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  company_slug := regexp_replace(company_slug, '^-|-$', '', 'g');

  -- Ensure slug is not empty
  IF company_slug = '' OR company_slug IS NULL THEN
    company_slug := 'company';
  END IF;

  -- Ensure slug uniqueness by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = company_slug) LOOP
    company_slug := company_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  END LOOP;

  -- Create the company
  INSERT INTO public.companies (name, slug)
  VALUES (company_name, company_slug)
  RETURNING id INTO new_company_id;

  -- Create the user profile with admin role
  INSERT INTO public.profiles (
    id,
    company_id,
    email,
    role,
    terms_accepted_at,
    auth_provider,
    first_name,
    last_name
  )
  VALUES (
    user_id,
    new_company_id,
    user_email,
    'admin',
    COALESCE(user_terms_accepted_at, NOW()),
    COALESCE(user_auth_provider, 'email'),
    user_first_name,
    user_last_name
  );

  RETURN new_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_and_profile(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 2. create_default_company_entitlements (SECURITY DEFINER)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_default_company_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.company_entitlements (company_id, tier_slug, is_trial, trial_ends_at)
  VALUES (NEW.id, 'free', true, NOW() + INTERVAL '14 days')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. get_current_user_company_id (SECURITY DEFINER)
-- Note: Already fixed in 20260127_rls_performance_optimization.sql but
-- re-applying to ensure consistency
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;

-- =============================================================================
-- 4. get_dashboard_summary (SECURITY DEFINER)
-- Using the secure version that derives company_id from auth.uid()
-- Drop the vulnerable version that accepts company_id as parameter
-- =============================================================================

-- Drop the vulnerable overload that accepts company_id parameter
-- This version allowed users to potentially query other companies' data
DROP FUNCTION IF EXISTS public.get_dashboard_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
  user_company_id UUID;
BEGIN
  -- SECURITY: Get company_id from the authenticated user's profile
  -- This prevents users from querying other companies' data
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- If user has no profile or no company, return empty result
  IF user_company_id IS NULL THEN
    RETURN json_build_object(
      'total_employees', 0,
      'at_risk_count', 0,
      'non_compliant_count', 0,
      'missing_snapshots', 0,
      'recent_trips', '[]'::json,
      'error', 'No company found for user'
    );
  END IF;

  SELECT json_build_object(
    'total_employees', (
      SELECT COUNT(*)
      FROM public.employees
      WHERE company_id = user_company_id
        AND deleted_at IS NULL
    ),
    'at_risk_count', (
      SELECT COUNT(*)
      FROM public.employee_compliance_snapshots ecs
      WHERE ecs.company_id = user_company_id
        AND ecs.risk_level IN ('amber', 'red')
    ),
    'non_compliant_count', (
      SELECT COUNT(*)
      FROM public.employee_compliance_snapshots ecs
      WHERE ecs.company_id = user_company_id
        AND ecs.is_compliant = false
    ),
    'missing_snapshots', (
      SELECT COUNT(*)
      FROM public.employees e
      LEFT JOIN public.employee_compliance_snapshots ecs ON e.id = ecs.employee_id
      WHERE e.company_id = user_company_id
        AND e.deleted_at IS NULL
        AND ecs.id IS NULL
    ),
    'recent_trips', (
      SELECT COALESCE(json_agg(t), '[]'::json)
      FROM (
        SELECT
          t.id,
          t.employee_id,
          e.name as employee_name,
          t.country,
          t.entry_date,
          t.exit_date,
          t.travel_days
        FROM public.trips t
        JOIN public.employees e ON e.id = t.employee_id
        WHERE e.company_id = user_company_id
          AND e.deleted_at IS NULL
          AND t.ghosted = false
        ORDER BY t.entry_date DESC
        LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- =============================================================================
-- 5. get_last_audit_hash (SECURITY DEFINER)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_last_audit_hash(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  last_hash TEXT;
BEGIN
  SELECT entry_hash INTO last_hash
  FROM public.audit_log
  WHERE company_id = p_company_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(last_hash, 'GENESIS');
END;
$$;

-- =============================================================================
-- 6. invalidate_compliance_snapshot (trigger function)
-- Not SECURITY DEFINER but best practice to set search_path
-- =============================================================================
CREATE OR REPLACE FUNCTION public.invalidate_compliance_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Delete the snapshot for the affected employee
  -- This triggers a recompute on next dashboard load
  DELETE FROM public.employee_compliance_snapshots
  WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- 7. prevent_audit_log_modifications (trigger function)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only'
    USING ERRCODE = '42501';
END;
$$;

-- =============================================================================
-- 7b. prevent_admin_audit_log_modifications (trigger function)
-- Separate function for admin_audit_log table
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only'
    USING ERRCODE = '42501';
END;
$$;

-- =============================================================================
-- 8. update_column_mappings_updated_at (trigger function)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_column_mappings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 9. update_updated_at_column (trigger function)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Add comments documenting the security fixes
-- =============================================================================
COMMENT ON FUNCTION public.create_company_and_profile(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT) IS
  'Creates company and links user profile. SECURITY DEFINER with search_path locked.';

COMMENT ON FUNCTION public.create_default_company_entitlements() IS
  'Trigger: Creates default entitlements for new companies. SECURITY DEFINER with search_path locked.';

COMMENT ON FUNCTION public.get_current_user_company_id() IS
  'Returns company_id for authenticated user. SECURITY DEFINER with search_path locked.';

COMMENT ON FUNCTION public.get_dashboard_summary() IS
  'Returns dashboard summary for authenticated user company. SECURITY DEFINER with search_path locked.';

COMMENT ON FUNCTION public.get_last_audit_hash(UUID) IS
  'Returns last audit log hash for integrity chain. SECURITY DEFINER with search_path locked.';

COMMENT ON FUNCTION public.invalidate_compliance_snapshot() IS
  'Trigger: Invalidates compliance snapshot on trip changes. search_path locked.';

COMMENT ON FUNCTION public.prevent_audit_log_modifications() IS
  'Trigger: Prevents UPDATE/DELETE on audit_log. search_path locked.';

COMMENT ON FUNCTION public.prevent_admin_audit_log_modifications() IS
  'Trigger: Prevents UPDATE/DELETE on admin_audit_log. search_path locked.';

COMMENT ON FUNCTION public.update_column_mappings_updated_at() IS
  'Trigger: Updates updated_at on column_mappings. search_path locked.';

COMMENT ON FUNCTION public.update_updated_at_column() IS
  'Trigger: Updates updated_at timestamp. search_path locked.';
