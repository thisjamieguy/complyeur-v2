-- ============================================================
-- Migration: 20260116_security_tenant_isolation.sql
-- Purpose: Critical security fixes for multi-tenant isolation
-- ============================================================
-- This migration fixes several security vulnerabilities:
-- 1. CRITICAL: Dashboard RPC function accepts any company_id
-- 2. HIGH: Soft-deleted employees visible via RLS
-- 3. MEDIUM: Admin tables lack explicit deny policies
-- ============================================================

-- ============================================================
-- FIX 1: CRITICAL - Dashboard RPC Function Security
-- ============================================================
-- The get_dashboard_summary() function was using SECURITY DEFINER
-- and accepting any company_id parameter without validation.
-- This allowed ANY authenticated user to query ANY company's data.
--
-- FIX: Remove the company_id parameter entirely and derive it
-- from the authenticated user's profile.
-- ============================================================

-- Drop the old vulnerable function
DROP FUNCTION IF EXISTS get_dashboard_summary(UUID);

-- Create the secure version that derives company_id from auth
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
  user_company_id UUID;
BEGIN
  -- SECURITY: Get company_id from the authenticated user's profile
  -- This prevents users from querying other companies' data
  SELECT company_id INTO user_company_id
  FROM profiles
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
      FROM employees
      WHERE company_id = user_company_id
        AND deleted_at IS NULL
    ),
    'at_risk_count', (
      SELECT COUNT(*)
      FROM employee_compliance_snapshots ecs
      WHERE ecs.company_id = user_company_id
        AND ecs.risk_level IN ('amber', 'red')
    ),
    'non_compliant_count', (
      SELECT COUNT(*)
      FROM employee_compliance_snapshots ecs
      WHERE ecs.company_id = user_company_id
        AND ecs.is_compliant = false
    ),
    'missing_snapshots', (
      SELECT COUNT(*)
      FROM employees e
      LEFT JOIN employee_compliance_snapshots ecs ON e.id = ecs.employee_id
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
        FROM trips t
        JOIN employees e ON e.id = t.employee_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_dashboard_summary IS 'Returns dashboard summary for the authenticated user''s company. Secure: derives company_id from auth.uid()';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;

-- ============================================================
-- FIX 2: HIGH - Employees RLS Soft-Delete Filter
-- ============================================================
-- The current employees RLS policy does NOT filter soft-deleted
-- records, leaving this to application code. This is risky because
-- if any code path forgets to filter deleted_at, deleted employees
-- will be returned.
--
-- FIX: Add soft-delete filter to RLS for regular users.
-- Admins get a separate policy to see deleted employees when needed.
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view employees from their company" ON employees;
DROP POLICY IF EXISTS "Users can view active employees from their company" ON employees;
DROP POLICY IF EXISTS "Admins can view deleted employees from their company" ON employees;

-- Policy for ALL users: Only see active (non-deleted) employees
CREATE POLICY "Users can view active employees from their company"
  ON employees
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

-- Policy for ADMINS: Can also see soft-deleted employees (for recovery/audit)
-- This allows admins to query with .is('deleted_at', 'not.null') when needed
CREATE POLICY "Admins can view deleted employees from their company"
  ON employees
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND deleted_at IS NOT NULL
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- FIX 3: MEDIUM - Admin Tables Explicit Deny Policies
-- ============================================================
-- Admin tables (tiers, company_entitlements, company_notes,
-- admin_audit_log) have RLS enabled but NO policies defined.
-- While this effectively blocks access, it's not explicit.
--
-- FIX: Add explicit deny-all policies to make intention clear
-- and prevent accidental policy additions from exposing data.
-- ============================================================

-- TIERS table: Allow read-only for authenticated users (public tier info)
-- but block all modifications
DROP POLICY IF EXISTS "Anyone can view tiers" ON tiers;
DROP POLICY IF EXISTS "Deny all modifications to tiers" ON tiers;

CREATE POLICY "Anyone can view tiers"
  ON tiers
  FOR SELECT
  USING (true);  -- Tier definitions are not sensitive

CREATE POLICY "Deny all modifications to tiers"
  ON tiers
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- COMPANY_ENTITLEMENTS table: Users can see their own company's entitlements
-- but cannot modify (admin-only via service role)
DROP POLICY IF EXISTS "Users can view own company entitlements" ON company_entitlements;
DROP POLICY IF EXISTS "Deny modifications to entitlements" ON company_entitlements;

CREATE POLICY "Users can view own company entitlements"
  ON company_entitlements
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Deny modifications to entitlements"
  ON company_entitlements
  FOR INSERT
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny updates to entitlements"
  ON company_entitlements
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny deletes to entitlements"
  ON company_entitlements
  FOR DELETE
  USING (false);

-- COMPANY_NOTES table: Deny all access (internal admin only)
DROP POLICY IF EXISTS "Deny all access to company notes" ON company_notes;

CREATE POLICY "Deny all access to company notes"
  ON company_notes
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ADMIN_AUDIT_LOG table: Deny all access (internal admin only)
DROP POLICY IF EXISTS "Deny all access to admin audit log" ON admin_audit_log;

CREATE POLICY "Deny all access to admin audit log"
  ON admin_audit_log
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- FIX 4: Add helper function for consistent company_id lookup
-- ============================================================
-- Ensure the helper function exists and is used consistently
-- This function is SECURITY DEFINER to prevent leaking company info

CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION get_current_user_company_id IS 'Returns the company_id of the currently authenticated user. Use in RLS policies for consistent tenant isolation.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_company_id TO authenticated;

-- ============================================================
-- FIX 5: Add security comment on all sensitive functions
-- ============================================================

COMMENT ON FUNCTION get_dashboard_summary IS
  'SECURITY: Derives company_id from authenticated user - cannot query other companies.';

-- ============================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================
-- Run these as an authenticated user to verify security:
--
-- 1. Test dashboard summary (should only return your company's data):
--    SELECT get_dashboard_summary();
--
-- 2. Test that you can't query other companies' employees:
--    SELECT * FROM employees WHERE company_id = 'other-company-uuid';
--    (Should return empty even if that company has employees)
--
-- 3. Test soft-delete filtering:
--    SELECT * FROM employees;
--    (Should NOT include any deleted_at IS NOT NULL records for non-admins)
--
-- 4. Test admin table access:
--    SELECT * FROM company_notes;
--    (Should return empty or error for regular users)
--
-- ============================================================
-- END OF MIGRATION
-- ============================================================
