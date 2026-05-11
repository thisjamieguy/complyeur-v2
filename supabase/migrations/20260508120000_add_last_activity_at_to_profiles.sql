-- Add last_activity_at to profiles to support session-timeout enforcement
-- introduced in commit ea8769a ("enforce inactive user blocking and session
-- timeout security"). The middleware UPDATEs this column on every
-- authenticated request and invalidates the session if the UPDATE errors,
-- which produced a login loop while the column was missing.
--
-- is_active was referenced by the same commit but is intentionally NOT added
-- here: the existing "Users can update own profile" RLS policy permits
-- full-row self-updates, so a deactivated user could re-enable themselves.
-- Adding is_active needs column-level grants or a trigger that pins the
-- column for non-admins. Tracked separately.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Backfill from updated_at so existing rows do not read NULL and silently
-- skip timeout enforcement, and do not all reset to "just active" on deploy.
UPDATE public.profiles
   SET last_activity_at = COALESCE(updated_at, created_at, now())
 WHERE last_activity_at IS NULL;
