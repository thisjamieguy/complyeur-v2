-- Migration: Track last authenticated activity for session timeout enforcement

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.last_activity_at IS 'Timestamp of most recent authenticated request for session inactivity enforcement';
