-- Add dashboard guided tour completion tracking for per-user onboarding UX.
-- Existing users are backfilled to NOW() so only new signups auto-start the tour.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dashboard_tour_completed_at timestamptz DEFAULT NULL;

UPDATE public.profiles
SET dashboard_tour_completed_at = NOW()
WHERE dashboard_tour_completed_at IS NULL;
