-- ============================================================================
-- GDPR Enhancements Migration for ComplyEUR
-- Phase 14: GDPR & Privacy Tools
-- ============================================================================
-- This migration adds:
-- 1. Hash chain columns to audit_log for tamper-evident logging
-- 2. deleted_at column to employees for soft delete
-- 3. anonymized_at column to employees for GDPR anonymization
-- 4. Indexes for GDPR operations
-- ============================================================================

-- ============================================================================
-- SECTION 1: AUDIT LOG ENHANCEMENTS FOR HASH CHAIN INTEGRITY
-- ============================================================================

-- Add hash chain columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'previous_hash'
  ) THEN
    ALTER TABLE audit_log ADD COLUMN previous_hash TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'entry_hash'
  ) THEN
    ALTER TABLE audit_log ADD COLUMN entry_hash TEXT;
  END IF;
END $$;

COMMENT ON COLUMN audit_log.previous_hash IS 'Hash of the previous audit log entry for chain integrity';
COMMENT ON COLUMN audit_log.entry_hash IS 'SHA-256 hash of this entry for tamper detection';

-- Index for hash chain verification
CREATE INDEX IF NOT EXISTS idx_audit_log_entry_hash ON audit_log(entry_hash);

-- ============================================================================
-- SECTION 2: EMPLOYEE SOFT DELETE AND ANONYMIZATION
-- ============================================================================

-- Add soft delete column to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE employees ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'anonymized_at'
  ) THEN
    ALTER TABLE employees ADD COLUMN anonymized_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN employees.deleted_at IS 'Soft delete timestamp - employee hidden from UI but recoverable for 30 days';
COMMENT ON COLUMN employees.anonymized_at IS 'Timestamp when employee was anonymized under GDPR right to erasure';

-- Index for finding deleted employees (for recovery UI and auto-purge)
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at) WHERE deleted_at IS NOT NULL;

-- Index for finding anonymized employees
CREATE INDEX IF NOT EXISTS idx_employees_anonymized_at ON employees(anonymized_at) WHERE anonymized_at IS NOT NULL;

-- ============================================================================
-- SECTION 3: UPDATE RLS POLICIES FOR SOFT DELETE
-- ============================================================================
-- By default, only show non-deleted employees in normal queries
-- Admins can still see deleted employees via separate queries

-- Drop and recreate employee SELECT policy to exclude soft-deleted by default
DROP POLICY IF EXISTS "Users can view employees from their company" ON employees;
CREATE POLICY "Users can view employees from their company"
  ON employees
  FOR SELECT
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    -- Note: deleted_at filter is handled at application level for flexibility
    -- This allows admins to query deleted employees when needed
  );

-- ============================================================================
-- SECTION 4: HELPER FUNCTION FOR GDPR AUDIT LOGGING
-- ============================================================================

-- Function to get the last audit log hash for a company
CREATE OR REPLACE FUNCTION get_last_audit_hash(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  last_hash TEXT;
BEGIN
  SELECT entry_hash INTO last_hash
  FROM audit_log
  WHERE company_id = p_company_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(last_hash, 'GENESIS');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_last_audit_hash IS 'Gets the hash of the last audit log entry for chain integrity';

-- ============================================================================
-- SECTION 5: GDPR AUDIT ACTION TYPES
-- ============================================================================
-- Document standard GDPR action types for consistency:
-- - DSAR_EXPORT: Data Subject Access Request export generated
-- - ANONYMIZE: Employee data anonymized
-- - SOFT_DELETE: Employee soft deleted (30-day recovery)
-- - RESTORE: Employee restored from soft delete
-- - HARD_DELETE: Employee permanently deleted
-- - AUTO_PURGE: System-initiated deletion via retention policy

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
