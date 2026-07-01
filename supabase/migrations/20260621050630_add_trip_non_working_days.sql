-- Travel Audit: capture working vs rest days per trip.
--
-- Adds `non_working_days` to trips: the number of rest / non-working days
-- that fall within a trip's date range. Working days are derived as
-- (travel_days - non_working_days). Private trips count all days as rest.
--
-- Source of truth on import: the Gantt importer detects "n/w" (non-working,
-- still abroad) cells; that count is now persisted here instead of discarded.
-- Manual trip entry exposes this as an editable "rest days" field.

BEGIN;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS non_working_days integer NOT NULL DEFAULT 0;

-- non_working_days must be a non-negative subset of the trip's duration.
-- We reference the base date columns (not the generated travel_days column)
-- so the check is valid for a STORED generated column.
ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_non_working_days_range;

ALTER TABLE public.trips
  ADD CONSTRAINT trips_non_working_days_range
  CHECK (
    non_working_days >= 0
    AND non_working_days <= ((exit_date - entry_date) + 1)
  );

COMMENT ON COLUMN public.trips.non_working_days IS
  'Rest / non-working days within the trip date range. Working days = travel_days - non_working_days. Private trips count all days as rest.';

COMMIT;
