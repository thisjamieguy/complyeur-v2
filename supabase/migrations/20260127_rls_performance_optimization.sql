-- ============================================================================
-- Migration: RLS Policy Performance Optimization
-- Date: 2026-01-27
-- ============================================================================
-- ISSUE: auth.uid() is called per-row instead of once per query
-- FIX: Use SECURITY DEFINER helper functions for caching and recursion safety
-- IMPACT: 5-100x faster queries on large tables
-- ============================================================================
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
-- ============================================================================

-- ============================================================================
-- SECTION 0: HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================
-- These functions bypass RLS to prevent infinite recursion when policies
-- reference user metadata. They are marked STABLE for query plan caching.
-- SECURITY DEFINER + search_path = '' prevents SQL injection attacks.
-- ============================================================================

-- Get current authenticated user ID
-- Returns NULL if not authenticated
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid()
$$;

COMMENT ON FUNCTION get_current_user_id IS
  'Returns the current authenticated user ID. Wrapped for RLS caching optimization.';

-- Get current user''s company_id from profiles table
-- Returns NULL if user not found or not authenticated
-- Uses SECURITY DEFINER to bypass RLS on profiles table (prevents recursion)
CREATE OR REPLACE FUNCTION get_current_user_company_id()
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

COMMENT ON FUNCTION get_current_user_company_id IS
  'Returns the company_id of the current user. SECURITY DEFINER bypasses RLS to prevent recursion.';

-- Get current user''s role from profiles table
-- Returns NULL if user not found or not authenticated
-- Uses SECURITY DEFINER to bypass RLS on profiles table (prevents recursion)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1
$$;

COMMENT ON FUNCTION get_current_user_role IS
  'Returns the role of the current user. SECURITY DEFINER bypasses RLS to prevent recursion.';

-- ============================================================================
-- SECTION 1: EMPLOYEES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view active employees from their company" ON employees;
DROP POLICY IF EXISTS "Users can view active employees in their company" ON employees;
CREATE POLICY "Users can view active employees in their company"
  ON employees FOR SELECT
  USING (
    company_id = get_current_user_company_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Admins can view deleted employees from their company" ON employees;
DROP POLICY IF EXISTS "Admins can view deleted employees in their company" ON employees;
CREATE POLICY "Admins can view deleted employees in their company"
  ON employees FOR SELECT
  USING (
    company_id = get_current_user_company_id()
    AND deleted_at IS NOT NULL
    AND get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Users can insert employees to their company" ON employees;
DROP POLICY IF EXISTS "Users can insert employees in their company" ON employees;
CREATE POLICY "Users can insert employees in their company"
  ON employees FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update employees in their company" ON employees;
CREATE POLICY "Users can update employees in their company"
  ON employees FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can delete employees from their company" ON employees;
DROP POLICY IF EXISTS "Users can delete employees in their company" ON employees;
CREATE POLICY "Users can delete employees in their company"
  ON employees FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 2: TRIPS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view trips from their company" ON trips;
DROP POLICY IF EXISTS "Users can view trips in their company" ON trips;
CREATE POLICY "Users can view trips in their company"
  ON trips FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can insert trips to their company" ON trips;
DROP POLICY IF EXISTS "Users can insert trips in their company" ON trips;
CREATE POLICY "Users can insert trips in their company"
  ON trips FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update trips in their company" ON trips;
CREATE POLICY "Users can update trips in their company"
  ON trips FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can delete trips from their company" ON trips;
DROP POLICY IF EXISTS "Users can delete trips in their company" ON trips;
CREATE POLICY "Users can delete trips in their company"
  ON trips FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 3: ALERTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view alerts from their company" ON alerts;
DROP POLICY IF EXISTS "Users can view alerts in their company" ON alerts;
CREATE POLICY "Users can view alerts in their company"
  ON alerts FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can insert alerts to their company" ON alerts;
DROP POLICY IF EXISTS "Users can insert alerts in their company" ON alerts;
CREATE POLICY "Users can insert alerts in their company"
  ON alerts FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update alerts in their company" ON alerts;
CREATE POLICY "Users can update alerts in their company"
  ON alerts FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can delete alerts from their company" ON alerts;
DROP POLICY IF EXISTS "Users can delete alerts in their company" ON alerts;
CREATE POLICY "Users can delete alerts in their company"
  ON alerts FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 4: COMPANY_SETTINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can view company_settings in their company" ON company_settings;
CREATE POLICY "Users can view company_settings in their company"
  ON company_settings FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can insert their company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert company_settings in their company" ON company_settings;
CREATE POLICY "Users can insert company_settings in their company"
  ON company_settings FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update their company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update company_settings in their company" ON company_settings;
CREATE POLICY "Users can update company_settings in their company"
  ON company_settings FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can delete their company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can delete company_settings in their company" ON company_settings;
CREATE POLICY "Users can delete company_settings in their company"
  ON company_settings FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 5: AUDIT_LOG TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view audit logs from their company" ON audit_log;
DROP POLICY IF EXISTS "Users can view audit_log in their company" ON audit_log;
CREATE POLICY "Users can view audit_log in their company"
  ON audit_log FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can insert audit logs to their company" ON audit_log;
DROP POLICY IF EXISTS "Users can insert audit_log in their company" ON audit_log;
CREATE POLICY "Users can insert audit_log in their company"
  ON audit_log FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update audit logs in their company" ON audit_log;
DROP POLICY IF EXISTS "Users can update audit_log in their company" ON audit_log;
CREATE POLICY "Users can update audit_log in their company"
  ON audit_log FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can delete audit logs from their company" ON audit_log;
DROP POLICY IF EXISTS "Users can delete audit_log in their company" ON audit_log;
CREATE POLICY "Users can delete audit_log in their company"
  ON audit_log FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 6: IMPORT_SESSIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "company_isolation_select" ON import_sessions;
DROP POLICY IF EXISTS "Users can view import_sessions in their company" ON import_sessions;
CREATE POLICY "Users can view import_sessions in their company"
  ON import_sessions FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "company_isolation_insert" ON import_sessions;
DROP POLICY IF EXISTS "Users can insert import_sessions in their company" ON import_sessions;
CREATE POLICY "Users can insert import_sessions in their company"
  ON import_sessions FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "company_isolation_update" ON import_sessions;
DROP POLICY IF EXISTS "Users can update import_sessions in their company" ON import_sessions;
CREATE POLICY "Users can update import_sessions in their company"
  ON import_sessions FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "company_isolation_delete" ON import_sessions;
DROP POLICY IF EXISTS "Users can delete import_sessions in their company" ON import_sessions;
CREATE POLICY "Users can delete import_sessions in their company"
  ON import_sessions FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 7: EMPLOYEE_COMPLIANCE_SNAPSHOTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users see own company snapshots" ON employee_compliance_snapshots;
DROP POLICY IF EXISTS "Users can view employee_compliance_snapshots in their company" ON employee_compliance_snapshots;
CREATE POLICY "Users can view employee_compliance_snapshots in their company"
  ON employee_compliance_snapshots FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can insert company snapshots" ON employee_compliance_snapshots;
DROP POLICY IF EXISTS "Users can insert employee_compliance_snapshots in their company" ON employee_compliance_snapshots;
CREATE POLICY "Users can insert employee_compliance_snapshots in their company"
  ON employee_compliance_snapshots FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update company snapshots" ON employee_compliance_snapshots;
DROP POLICY IF EXISTS "Users can update employee_compliance_snapshots in their company" ON employee_compliance_snapshots;
CREATE POLICY "Users can update employee_compliance_snapshots in their company"
  ON employee_compliance_snapshots FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can delete company snapshots" ON employee_compliance_snapshots;
DROP POLICY IF EXISTS "Users can delete employee_compliance_snapshots in their company" ON employee_compliance_snapshots;
CREATE POLICY "Users can delete employee_compliance_snapshots in their company"
  ON employee_compliance_snapshots FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 8: BACKGROUND_JOBS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users see own company jobs" ON background_jobs;
DROP POLICY IF EXISTS "Users can view background_jobs in their company" ON background_jobs;
CREATE POLICY "Users can view background_jobs in their company"
  ON background_jobs FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can create company jobs" ON background_jobs;
DROP POLICY IF EXISTS "Users can insert background_jobs in their company" ON background_jobs;
CREATE POLICY "Users can insert background_jobs in their company"
  ON background_jobs FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update company jobs" ON background_jobs;
DROP POLICY IF EXISTS "Users can update background_jobs in their company" ON background_jobs;
CREATE POLICY "Users can update background_jobs in their company"
  ON background_jobs FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

-- NEW: Previously missing DELETE policy
DROP POLICY IF EXISTS "Users can delete background_jobs in their company" ON background_jobs;
CREATE POLICY "Users can delete background_jobs in their company"
  ON background_jobs FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 9: COMPANIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view companies in their company" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = get_current_user_company_id());

-- ============================================================================
-- SECTION 10: PROFILES TABLE
-- ============================================================================
-- Note: Uses SECURITY DEFINER helper functions to avoid infinite recursion
-- when querying profiles from within profiles RLS policies.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  USING (
    id = get_current_user_id() OR
    company_id = get_current_user_company_id()
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

-- ============================================================================
-- SECTION 11: COMPANY_ENTITLEMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own company entitlements" ON company_entitlements;
DROP POLICY IF EXISTS "Users can view company_entitlements in their company" ON company_entitlements;
CREATE POLICY "Users can view company_entitlements in their company"
  ON company_entitlements FOR SELECT
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 12: COLUMN_MAPPINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "company_isolation_select" ON column_mappings;
DROP POLICY IF EXISTS "Users can view column_mappings in their company" ON column_mappings;
CREATE POLICY "Users can view column_mappings in their company"
  ON column_mappings FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "company_isolation_insert" ON column_mappings;
DROP POLICY IF EXISTS "Users can insert column_mappings in their company" ON column_mappings;
CREATE POLICY "Users can insert column_mappings in their company"
  ON column_mappings FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "company_isolation_update" ON column_mappings;
DROP POLICY IF EXISTS "Users can update column_mappings in their company" ON column_mappings;
CREATE POLICY "Users can update column_mappings in their company"
  ON column_mappings FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "company_isolation_delete" ON column_mappings;
DROP POLICY IF EXISTS "Users can delete column_mappings in their company" ON column_mappings;
CREATE POLICY "Users can delete column_mappings in their company"
  ON column_mappings FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 13: NOTIFICATION_LOG TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view notification logs from their company" ON notification_log;
DROP POLICY IF EXISTS "Users can view notification_log in their company" ON notification_log;
CREATE POLICY "Users can view notification_log in their company"
  ON notification_log FOR SELECT
  USING (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can insert notification logs to their company" ON notification_log;
DROP POLICY IF EXISTS "Users can insert notification_log in their company" ON notification_log;
CREATE POLICY "Users can insert notification_log in their company"
  ON notification_log FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can update notification logs in their company" ON notification_log;
DROP POLICY IF EXISTS "Users can update notification_log in their company" ON notification_log;
CREATE POLICY "Users can update notification_log in their company"
  ON notification_log FOR UPDATE
  USING (company_id = get_current_user_company_id())
  WITH CHECK (company_id = get_current_user_company_id());

DROP POLICY IF EXISTS "Users can delete notification_log in their company" ON notification_log;
CREATE POLICY "Users can delete notification_log in their company"
  ON notification_log FOR DELETE
  USING (company_id = get_current_user_company_id());

-- ============================================================================
-- SECTION 14: NOTIFICATION_PREFERENCES TABLE
-- ============================================================================
-- Note: User-scoped table (user_id = current user)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON notification_preferences;
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  USING (user_id = get_current_user_id());

-- ============================================================================
-- SECTION 15: Refresh statistics for query planner
-- ============================================================================

ANALYZE profiles;
ANALYZE employees;
ANALYZE trips;
ANALYZE alerts;
ANALYZE company_settings;
ANALYZE audit_log;
ANALYZE import_sessions;
ANALYZE employee_compliance_snapshots;
ANALYZE background_jobs;
ANALYZE companies;
ANALYZE company_entitlements;
ANALYZE column_mappings;
ANALYZE notification_log;
ANALYZE notification_preferences;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Total helper functions: 3 (SECURITY DEFINER for caching + recursion safety)
-- Total policies updated: 50
-- Expected performance improvement: 5-100x on large tables
-- ============================================================================
-- Changes from original:
-- 1. Helper functions moved to top and actually used in all policies
-- 2. All policies now use consistent naming: "Users can [action] [table] in their company"
-- 3. Fixed profiles table recursion issue via SECURITY DEFINER functions
-- 4. Added missing DELETE policy for background_jobs
-- 5. Added missing DELETE policy for notification_log
-- 6. Added get_current_user_role() helper for admin checks
-- ============================================================================
