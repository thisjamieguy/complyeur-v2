-- Migration: Add status threshold columns for configurable dashboard badges
-- Paradigm: "days used" (0-60 = green, 61-75 = amber, 76-89 = red, 90+ = breach)

-- Add status threshold columns (separate from existing risk_threshold columns)
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS status_green_max INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS status_amber_max INTEGER DEFAULT 75,
ADD COLUMN IF NOT EXISTS status_red_max INTEGER DEFAULT 89;

-- Add validation constraints
ALTER TABLE company_settings
ADD CONSTRAINT check_status_green_max
  CHECK (status_green_max >= 1 AND status_green_max <= 89),
ADD CONSTRAINT check_status_amber_max
  CHECK (status_amber_max >= 1 AND status_amber_max <= 89),
ADD CONSTRAINT check_status_red_max
  CHECK (status_red_max >= 1 AND status_red_max <= 89),
ADD CONSTRAINT check_status_threshold_hierarchy
  CHECK (status_green_max < status_amber_max AND status_amber_max < status_red_max);

-- Documentation
COMMENT ON COLUMN company_settings.status_green_max IS 'Max days used for green (Compliant) status. Default: 60';
COMMENT ON COLUMN company_settings.status_amber_max IS 'Max days used for amber (At Risk) status. Default: 75';
COMMENT ON COLUMN company_settings.status_red_max IS 'Max days used for red (Non-Compliant) status. Default: 89. 90+ is always breach.';
