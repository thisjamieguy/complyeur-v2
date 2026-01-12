-- ============================================================================
-- Compliance Snapshot Layer for ComplyEUR
-- Phase 17: Performance Optimization - Item #143c
-- ============================================================================
-- This migration creates a precomputation layer for compliance calculations.
-- Instead of computing the rolling 90/180-day window on every dashboard load,
-- we store snapshots that are invalidated when trips change.
-- ============================================================================

-- ============================================================================
-- SECTION 1: COMPLIANCE SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_compliance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Cached compliance data
  days_used INTEGER NOT NULL,
  days_remaining INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('green', 'amber', 'red')),
  is_compliant BOOLEAN NOT NULL DEFAULT true,

  -- Additional computed fields
  next_reset_date DATE,  -- When they would get 90 days back if no more travel

  -- Cache metadata
  snapshot_generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trips_hash TEXT,  -- Hash of trip data used for calculation (for validation)

  -- Ensure one snapshot per employee
  UNIQUE(employee_id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE employee_compliance_snapshots IS 'Precomputed compliance status for dashboard performance';
COMMENT ON COLUMN employee_compliance_snapshots.days_used IS 'Days used in current 180-day rolling window';
COMMENT ON COLUMN employee_compliance_snapshots.days_remaining IS '90 - days_used (can be negative if over limit)';
COMMENT ON COLUMN employee_compliance_snapshots.risk_level IS 'green (>=30), amber (10-29), red (<10 or over)';
COMMENT ON COLUMN employee_compliance_snapshots.trips_hash IS 'MD5 hash of trip data for cache validation';
COMMENT ON COLUMN employee_compliance_snapshots.snapshot_generated_at IS 'When this snapshot was computed';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_snapshots_company ON employee_compliance_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_risk ON employee_compliance_snapshots(risk_level);
CREATE INDEX IF NOT EXISTS idx_snapshots_generated ON employee_compliance_snapshots(snapshot_generated_at);

-- Enable RLS
ALTER TABLE employee_compliance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users see own company snapshots" ON employee_compliance_snapshots;
CREATE POLICY "Users see own company snapshots"
  ON employee_compliance_snapshots
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert company snapshots" ON employee_compliance_snapshots;
CREATE POLICY "Users can insert company snapshots"
  ON employee_compliance_snapshots
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update company snapshots" ON employee_compliance_snapshots;
CREATE POLICY "Users can update company snapshots"
  ON employee_compliance_snapshots
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete company snapshots" ON employee_compliance_snapshots;
CREATE POLICY "Users can delete company snapshots"
  ON employee_compliance_snapshots
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_snapshots_updated_at ON employee_compliance_snapshots;
CREATE TRIGGER update_snapshots_updated_at
  BEFORE UPDATE ON employee_compliance_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: SNAPSHOT INVALIDATION TRIGGER
-- ============================================================================
-- When a trip is added, updated, or deleted, mark the employee's snapshot as stale
-- by deleting it. The application will recompute on next access.

CREATE OR REPLACE FUNCTION invalidate_compliance_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the snapshot for the affected employee
  -- This triggers a recompute on next dashboard load
  DELETE FROM employee_compliance_snapshots
  WHERE employee_id = COALESCE(NEW.employee_id, OLD.employee_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION invalidate_compliance_snapshot IS 'Invalidates compliance snapshot when trip data changes';

-- Create trigger on trips table
DROP TRIGGER IF EXISTS trip_invalidates_snapshot ON trips;
CREATE TRIGGER trip_invalidates_snapshot
  AFTER INSERT OR UPDATE OR DELETE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_compliance_snapshot();

-- ============================================================================
-- SECTION 3: BACKGROUND JOBS TABLE
-- ============================================================================
-- For async operations like bulk recalculation, exports, and imports.

CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Job type and status
  job_type TEXT NOT NULL,  -- 'bulk_recalc', 'export_csv', 'export_pdf', 'import_excel', etc.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Progress tracking
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER,
  progress_message TEXT,

  -- Retry handling
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,

  -- Job data
  input_data JSONB,   -- Job parameters (e.g., employee IDs, date range)
  output_data JSONB,  -- Results (e.g., file URL, processed count)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id)
);

COMMENT ON TABLE background_jobs IS 'Async job queue for heavy operations';
COMMENT ON COLUMN background_jobs.job_type IS 'Type of job: bulk_recalc, export_csv, export_pdf, import_excel, rebuild_snapshots';
COMMENT ON COLUMN background_jobs.status IS 'pending -> running -> completed/failed';
COMMENT ON COLUMN background_jobs.input_data IS 'JSON parameters for the job';
COMMENT ON COLUMN background_jobs.output_data IS 'JSON results (file URLs, counts, etc.)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company ON background_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON background_jobs(status)
  WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_jobs_created ON background_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON background_jobs(job_type, status);

-- Enable RLS
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users see own company jobs" ON background_jobs;
CREATE POLICY "Users see own company jobs"
  ON background_jobs
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create company jobs" ON background_jobs;
CREATE POLICY "Users can create company jobs"
  ON background_jobs
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update company jobs" ON background_jobs;
CREATE POLICY "Users can update company jobs"
  ON background_jobs
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- SECTION 4: DASHBOARD SUMMARY RPC
-- ============================================================================
-- Single function call to get all dashboard data in one round trip.

CREATE OR REPLACE FUNCTION get_dashboard_summary(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_employees', (
      SELECT COUNT(*)
      FROM employees
      WHERE company_id = p_company_id
        AND deleted_at IS NULL
    ),
    'at_risk_count', (
      SELECT COUNT(*)
      FROM employee_compliance_snapshots ecs
      WHERE ecs.company_id = p_company_id
        AND ecs.risk_level IN ('amber', 'red')
    ),
    'non_compliant_count', (
      SELECT COUNT(*)
      FROM employee_compliance_snapshots ecs
      WHERE ecs.company_id = p_company_id
        AND ecs.is_compliant = false
    ),
    'missing_snapshots', (
      SELECT COUNT(*)
      FROM employees e
      LEFT JOIN employee_compliance_snapshots ecs ON e.id = ecs.employee_id
      WHERE e.company_id = p_company_id
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
        WHERE e.company_id = p_company_id
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

COMMENT ON FUNCTION get_dashboard_summary IS 'Returns dashboard summary in single DB round trip';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;

-- ============================================================================
-- SECTION 5: GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON employee_compliance_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON background_jobs TO authenticated;

-- ============================================================================
-- SECTION 6: ANALYZE FOR QUERY PLANNER
-- ============================================================================

ANALYZE employee_compliance_snapshots;
ANALYZE background_jobs;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
