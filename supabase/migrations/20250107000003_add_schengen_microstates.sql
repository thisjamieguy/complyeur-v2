-- ============================================================================
-- Add Schengen Microstates and Missing Countries Migration
-- ============================================================================
-- This migration adds the four Schengen microstates (Monaco, Vatican City,
-- San Marino, Andorra) and Bulgaria/Romania to the schengen_countries table.
-- These countries have open borders with Schengen and count toward 90-day limit.
-- ============================================================================

-- Add missing full members (Bulgaria and Romania joined in 2024)
INSERT INTO schengen_countries (code, name, is_full_member) VALUES
  ('BG', 'Bulgaria', true),
  ('RO', 'Romania', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_full_member = EXCLUDED.is_full_member;

-- Add de facto Schengen microstates (open borders, count toward 90 days)
INSERT INTO schengen_countries (code, name, is_full_member) VALUES
  ('MC', 'Monaco', false),
  ('VA', 'Vatican City', false),
  ('SM', 'San Marino', false),
  ('AD', 'Andorra', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_full_member = EXCLUDED.is_full_member;

-- Add notes column if it doesn't exist (for documenting microstate status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schengen_countries' AND column_name = 'notes'
  ) THEN
    ALTER TABLE schengen_countries ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Update notes for microstates
UPDATE schengen_countries SET notes = 'De facto Schengen via France' WHERE code = 'MC';
UPDATE schengen_countries SET notes = 'De facto Schengen via Italy' WHERE code = 'VA';
UPDATE schengen_countries SET notes = 'De facto Schengen via Italy' WHERE code = 'SM';
UPDATE schengen_countries SET notes = 'De facto Schengen via France/Spain' WHERE code = 'AD';
UPDATE schengen_countries SET notes = 'Full member since January 2024' WHERE code = 'BG';
UPDATE schengen_countries SET notes = 'Full member since January 2024' WHERE code = 'RO';

COMMENT ON COLUMN schengen_countries.notes IS 'Additional notes about the country''s Schengen status';
