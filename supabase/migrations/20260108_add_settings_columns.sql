-- Migration: Add additional columns to company_settings for Phase 13
-- This adds session timeout, risk thresholds, forecasting, and notification preferences

-- Add session timeout column
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 30;

-- Add risk threshold columns (green/amber cutoffs for days remaining)
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS risk_threshold_green INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS risk_threshold_amber INTEGER DEFAULT 10;

-- Add future job warning threshold (for forecasting)
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS future_job_warning_threshold INTEGER DEFAULT 80;

-- Add notification preference columns
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS notify_70_days BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_85_days BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_90_days BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_digest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_alert_threshold INTEGER CHECK (custom_alert_threshold IS NULL OR (custom_alert_threshold >= 60 AND custom_alert_threshold <= 85));

-- Add constraints
ALTER TABLE company_settings
ADD CONSTRAINT check_session_timeout CHECK (session_timeout_minutes >= 5 AND session_timeout_minutes <= 120),
ADD CONSTRAINT check_retention_months CHECK (retention_months >= 12 AND retention_months <= 84),
ADD CONSTRAINT check_risk_threshold_green CHECK (risk_threshold_green >= 1 AND risk_threshold_green <= 89),
ADD CONSTRAINT check_risk_threshold_amber CHECK (risk_threshold_amber >= 1 AND risk_threshold_amber <= 88),
ADD CONSTRAINT check_future_job_warning CHECK (future_job_warning_threshold >= 50 AND future_job_warning_threshold <= 89);

-- Add comments for documentation
COMMENT ON COLUMN company_settings.session_timeout_minutes IS 'Minutes of inactivity before user is logged out (5-120)';
COMMENT ON COLUMN company_settings.risk_threshold_green IS 'Days remaining >= this value shows green status';
COMMENT ON COLUMN company_settings.risk_threshold_amber IS 'Days remaining >= this value shows amber status (below = red)';
COMMENT ON COLUMN company_settings.future_job_warning_threshold IS 'Days threshold for future job warnings (50-89)';
COMMENT ON COLUMN company_settings.notify_70_days IS 'Send email when employee reaches 70 days used';
COMMENT ON COLUMN company_settings.notify_85_days IS 'Send email when employee reaches 85 days used';
COMMENT ON COLUMN company_settings.notify_90_days IS 'Send email when employee reaches 90 days (breach)';
COMMENT ON COLUMN company_settings.weekly_digest IS 'Send weekly summary email every Monday';
COMMENT ON COLUMN company_settings.custom_alert_threshold IS 'Optional custom threshold (60-85 days)';
