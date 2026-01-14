-- ============================================================
-- Column Mappings Table - Stores saved column mappings for imports
-- Part of Phase 3: Column Mapping UI
-- ============================================================

-- Column Mappings Table
CREATE TABLE IF NOT EXISTS column_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Mapping metadata
  name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL CHECK (format IN ('employees', 'trips', 'gantt')),

  -- Mapping configuration (e.g., { "Mitarbeiter": "first_name", "Einreise": "entry_date" })
  mappings JSONB NOT NULL,

  -- Usage tracking
  times_used INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT mappings_not_empty CHECK (jsonb_typeof(mappings) = 'object' AND mappings != '{}')
);

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_column_mappings_company ON column_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_column_mappings_format ON column_mappings(format);
CREATE INDEX IF NOT EXISTS idx_column_mappings_created ON column_mappings(created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS
ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their company's mappings
DROP POLICY IF EXISTS "company_isolation_select" ON column_mappings;
CREATE POLICY "company_isolation_select" ON column_mappings
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "company_isolation_insert" ON column_mappings;
CREATE POLICY "company_isolation_insert" ON column_mappings
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "company_isolation_update" ON column_mappings;
CREATE POLICY "company_isolation_update" ON column_mappings
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "company_isolation_delete" ON column_mappings;
CREATE POLICY "company_isolation_delete" ON column_mappings
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- Trigger for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_column_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_column_mappings_updated_at ON column_mappings;
CREATE TRIGGER trigger_column_mappings_updated_at
  BEFORE UPDATE ON column_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_column_mappings_updated_at();

-- ============================================================
-- Grant permissions
-- ============================================================

GRANT ALL ON column_mappings TO authenticated;

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON TABLE column_mappings IS 'Stores saved column mappings for import operations';
COMMENT ON COLUMN column_mappings.name IS 'User-friendly name for this mapping (e.g., "HR System Export")';
COMMENT ON COLUMN column_mappings.description IS 'Optional description of when to use this mapping';
COMMENT ON COLUMN column_mappings.format IS 'Import format this mapping applies to: employees, trips, or gantt';
COMMENT ON COLUMN column_mappings.mappings IS 'JSON object mapping source column names to target fields';
COMMENT ON COLUMN column_mappings.times_used IS 'Number of times this mapping has been applied';
COMMENT ON COLUMN column_mappings.last_used_at IS 'Timestamp of last usage';
