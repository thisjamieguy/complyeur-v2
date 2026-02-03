-- ============================================================================
-- Migration: Fix RLS Linter Warnings
-- Date: 2026-01-28
-- ============================================================================
-- Fixes two categories of Supabase linter warnings:
-- 1. auth_rls_initplan: MFA tables using auth.uid() instead of (select auth.uid())
-- 2. multiple_permissive_policies: Conflicting policies on audit_log and employees
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: FIX MFA_BACKUP_CODES POLICIES
-- ============================================================================
-- Issue: Policies use auth.uid() directly, causing per-row re-evaluation
-- Fix: Wrap auth.uid() in (select ...) for single evaluation per query
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own MFA backup codes" ON mfa_backup_codes;
DROP POLICY IF EXISTS "Users can insert own MFA backup codes" ON mfa_backup_codes;
DROP POLICY IF EXISTS "Users can update own MFA backup codes" ON mfa_backup_codes;
DROP POLICY IF EXISTS "Users can delete own MFA backup codes" ON mfa_backup_codes;

CREATE POLICY "Users can view own MFA backup codes"
  ON mfa_backup_codes FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own MFA backup codes"
  ON mfa_backup_codes FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own MFA backup codes"
  ON mfa_backup_codes FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own MFA backup codes"
  ON mfa_backup_codes FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- SECTION 2: FIX MFA_BACKUP_SESSIONS POLICIES
-- ============================================================================
-- Same issue as mfa_backup_codes
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own MFA backup sessions" ON mfa_backup_sessions;
DROP POLICY IF EXISTS "Users can insert own MFA backup sessions" ON mfa_backup_sessions;
DROP POLICY IF EXISTS "Users can delete own MFA backup sessions" ON mfa_backup_sessions;

CREATE POLICY "Users can view own MFA backup sessions"
  ON mfa_backup_sessions FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own MFA backup sessions"
  ON mfa_backup_sessions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own MFA backup sessions"
  ON mfa_backup_sessions FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- SECTION 3: FIX AUDIT_LOG MULTIPLE PERMISSIVE POLICIES
-- ============================================================================
-- Issue: Two conflicting policies exist for UPDATE and DELETE:
--   1. "Users can update/delete audit_log in their company" (from rls_performance_optimization)
--   2. "Deny update/delete on audit log" (from audit_log_immutability)
--
-- Both are PERMISSIVE, so Postgres ORs them together.
-- Since one allows and one denies, the linter flags this.
--
-- Fix: Drop the permissive "Users can..." policies since audit_log is append-only.
-- The deny policies and trigger from audit_log_immutability handle enforcement.
-- ============================================================================

DROP POLICY IF EXISTS "Users can update audit_log in their company" ON audit_log;
DROP POLICY IF EXISTS "Users can delete audit_log in their company" ON audit_log;

-- ============================================================================
-- SECTION 4: FIX EMPLOYEES MULTIPLE PERMISSIVE SELECT POLICIES
-- ============================================================================
-- Issue: Two SELECT policies exist:
--   1. "Users can view active employees in their company" (deleted_at IS NULL)
--   2. "Admins can view deleted employees in their company" (deleted_at IS NOT NULL + admin)
--
-- Both are PERMISSIVE, causing suboptimal performance.
--
-- Fix: Combine into a single policy with OR logic
-- ============================================================================

DROP POLICY IF EXISTS "Users can view active employees in their company" ON employees;
DROP POLICY IF EXISTS "Admins can view deleted employees in their company" ON employees;

CREATE POLICY "Users can view employees in their company"
  ON employees FOR SELECT
  USING (
    company_id = get_current_user_company_id()
    AND (
      -- Regular users can see active employees
      deleted_at IS NULL
      OR
      -- Admins can also see deleted employees
      (deleted_at IS NOT NULL AND get_current_user_role() = 'admin')
    )
  );

-- ============================================================================
-- SECTION 5: Refresh statistics for query planner
-- ============================================================================

ANALYZE mfa_backup_codes;
ANALYZE mfa_backup_sessions;
ANALYZE audit_log;
ANALYZE employees;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Summary of changes:
-- 1. MFA backup_codes: 4 policies recreated with (select auth.uid()) wrapper
-- 2. MFA backup_sessions: 3 policies recreated with (select auth.uid()) wrapper
-- 3. audit_log: Removed conflicting UPDATE/DELETE permissive policies
-- 4. employees: Consolidated 2 SELECT policies into 1 with OR logic
-- ============================================================================
