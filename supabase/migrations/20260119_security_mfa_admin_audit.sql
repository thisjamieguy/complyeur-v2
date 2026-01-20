-- Migration: MFA backup codes + admin audit log immutability
-- Purpose: Support MFA backup codes and enforce append-only admin audit logging

BEGIN;

-- ============================================================
-- MFA BACKUP CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_hash
  ON mfa_backup_codes(user_id, code_hash);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_unused
  ON mfa_backup_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own MFA backup codes" ON mfa_backup_codes;
CREATE POLICY "Users can view own MFA backup codes"
  ON mfa_backup_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own MFA backup codes" ON mfa_backup_codes;
CREATE POLICY "Users can insert own MFA backup codes"
  ON mfa_backup_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own MFA backup codes" ON mfa_backup_codes;
CREATE POLICY "Users can update own MFA backup codes"
  ON mfa_backup_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own MFA backup codes" ON mfa_backup_codes;
CREATE POLICY "Users can delete own MFA backup codes"
  ON mfa_backup_codes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- MFA BACKUP SESSIONS (short-lived)
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_backup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mfa_backup_sessions_hash
  ON mfa_backup_sessions(session_hash);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_sessions_user
  ON mfa_backup_sessions(user_id);

ALTER TABLE mfa_backup_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own MFA backup sessions" ON mfa_backup_sessions;
CREATE POLICY "Users can view own MFA backup sessions"
  ON mfa_backup_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own MFA backup sessions" ON mfa_backup_sessions;
CREATE POLICY "Users can insert own MFA backup sessions"
  ON mfa_backup_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own MFA backup sessions" ON mfa_backup_sessions;
CREATE POLICY "Users can delete own MFA backup sessions"
  ON mfa_backup_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- ADMIN AUDIT LOG IMMUTABILITY (append-only)
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_admin_audit_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_log is append-only'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_admin_audit_log_modifications ON admin_audit_log;
CREATE TRIGGER prevent_admin_audit_log_modifications
  BEFORE UPDATE OR DELETE ON admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_admin_audit_log_modifications();

COMMIT;
