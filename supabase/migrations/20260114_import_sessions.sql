-- ============================================================
-- Import Sessions Table - Tracks data import operations
-- Part of Phase 1: Data Import Feature
-- ============================================================

-- Import Sessions Table
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Import metadata
  format TEXT NOT NULL CHECK (format IN ('employees', 'trips', 'gantt')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsing', 'validating', 'ready', 'importing', 'completed', 'failed')),

  -- File info
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max

  -- Processing stats
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,

  -- Data storage
  parsed_data JSONB,
  validation_errors JSONB DEFAULT '[]',
  result JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_import_sessions_company ON import_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_user ON import_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created ON import_sessions(created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their company's imports
CREATE POLICY "company_isolation_select" ON import_sessions
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "company_isolation_insert" ON import_sessions
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "company_isolation_update" ON import_sessions
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "company_isolation_delete" ON import_sessions
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- Grant permissions
-- ============================================================

GRANT ALL ON import_sessions TO authenticated;

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON TABLE import_sessions IS 'Tracks data import operations for employees and trips';
COMMENT ON COLUMN import_sessions.format IS 'Type of import: employees, trips, or gantt';
COMMENT ON COLUMN import_sessions.status IS 'Current state of the import process';
COMMENT ON COLUMN import_sessions.parsed_data IS 'JSON array of parsed row data';
COMMENT ON COLUMN import_sessions.validation_errors IS 'JSON array of validation errors/warnings';
COMMENT ON COLUMN import_sessions.result IS 'Final import results (counts, errors)';
