-- Migration: Enforce append-only audit_log
-- Purpose: Deny UPDATE/DELETE and block modifications via trigger

BEGIN;

-- ============================================================
-- AUDIT LOG IMMUTABILITY (append-only)
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_audit_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_log_modifications ON audit_log;
CREATE TRIGGER prevent_audit_log_modifications
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modifications();

-- Remove UPDATE/DELETE policies; keep SELECT/INSERT only
DROP POLICY IF EXISTS "Users can update audit logs in their company" ON audit_log;
DROP POLICY IF EXISTS "Users can delete audit logs from their company" ON audit_log;

CREATE POLICY "Deny update on audit log"
  ON audit_log FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny delete on audit log"
  ON audit_log FOR DELETE
  USING (false);

-- Revoke write access that is no longer needed
REVOKE UPDATE, DELETE ON audit_log FROM authenticated;

COMMIT;
