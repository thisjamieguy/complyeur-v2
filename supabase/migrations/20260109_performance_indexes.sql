-- ============================================================================
-- Performance Optimization Indexes for ComplyEUR
-- Phase 17: Performance Optimization
-- ============================================================================
-- This migration adds additional indexes to improve query performance,
-- especially for RLS policies and compliance calculations.
-- ============================================================================

-- ============================================================================
-- SECTION 1: VERIFY EXISTING CORE INDEXES
-- ============================================================================
-- These should already exist from the initial migration, but we ensure they're present

-- Core RLS performance indexes
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_company_id ON trips(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_employee_id ON trips(employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- Date range queries for compliance calculations
CREATE INDEX IF NOT EXISTS idx_trips_entry_date ON trips(entry_date);
CREATE INDEX IF NOT EXISTS idx_trips_exit_date ON trips(exit_date);

-- Composite index for common query pattern (trips by employee with date ordering)
CREATE INDEX IF NOT EXISTS idx_trips_employee_date_range ON trips(employee_id, entry_date, exit_date);

-- ============================================================================
-- SECTION 2: NEW PERFORMANCE INDEXES
-- ============================================================================

-- Index for filtering non-ghosted trips (used in compliance calculations)
-- Partial index: only index rows where ghosted = false (most common case)
CREATE INDEX IF NOT EXISTS idx_trips_employee_not_ghosted
  ON trips(employee_id, entry_date DESC, exit_date DESC)
  WHERE ghosted = false;

-- Index for filtering non-deleted employees (soft delete pattern)
CREATE INDEX IF NOT EXISTS idx_employees_company_not_deleted
  ON employees(company_id, name)
  WHERE deleted_at IS NULL;

-- Composite index for dashboard queries (employee with trips count)
-- This helps with the common pattern of fetching employees and counting their trips
CREATE INDEX IF NOT EXISTS idx_trips_employee_company
  ON trips(employee_id, company_id);

-- Index for alerts queries (unresolved alerts by company)
CREATE INDEX IF NOT EXISTS idx_alerts_company_unresolved
  ON alerts(company_id, created_at DESC)
  WHERE resolved = false;

-- Index for audit log queries (recent actions by company)
CREATE INDEX IF NOT EXISTS idx_audit_log_company_recent
  ON audit_log(company_id, created_at DESC);

-- ============================================================================
-- SECTION 3: RLS POLICY OPTIMIZATION
-- ============================================================================
-- The existing RLS policies use subqueries like:
--   (SELECT company_id FROM profiles WHERE id = auth.uid())
--
-- This is efficient because:
-- 1. auth.uid() returns a single UUID (the current user)
-- 2. profiles.id is the primary key, so the lookup is O(1)
-- 3. PostgreSQL caches this result for the duration of the statement
--
-- However, we add a GIN index on profiles to ensure fast lookups
-- for potential future JWT claim patterns

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ============================================================================
-- SECTION 4: STATISTICS REFRESH
-- ============================================================================
-- Analyze tables to update query planner statistics
-- This helps PostgreSQL make better index choices

ANALYZE employees;
ANALYZE trips;
ANALYZE profiles;
ANALYZE alerts;
ANALYZE audit_log;

-- ============================================================================
-- SECTION 5: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_trips_employee_not_ghosted IS 'Partial index for compliance calculations - only non-ghosted trips';
COMMENT ON INDEX idx_employees_company_not_deleted IS 'Partial index for dashboard - only active employees';
COMMENT ON INDEX idx_alerts_company_unresolved IS 'Partial index for alert banner - only unresolved alerts';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
