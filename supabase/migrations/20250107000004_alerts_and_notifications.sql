-- ============================================================================
-- Alerts & Notifications System Migration for ComplyEUR
-- ============================================================================
-- This migration enhances the alert system and adds notification logging
-- for the proactive warning system (warning at 70 days, urgent at 85, breach at 90)
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENHANCE ALERTS TABLE
-- ============================================================================

-- Add alert_type column for categorizing and preventing duplicate alerts
-- alert_type: 'warning' (user-configurable, default 70), 'urgent' (user-configurable, default 85), 'breach' (fixed at 90)
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_type TEXT;

-- Add days_used to store the compliance state when alert was created
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS days_used INTEGER;

-- Add acknowledged column (separate from resolved - acknowledged = user saw it)
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES profiles(id);

-- Add constraint for alert_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alerts_alert_type_check'
  ) THEN
    ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check
      CHECK (alert_type IN ('warning', 'urgent', 'breach'));
  END IF;
END $$;

-- Create unique index to prevent duplicate alerts per employee per threshold until resolved
-- This ensures only ONE active alert per type per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_employee_type_active
  ON alerts(employee_id, alert_type)
  WHERE resolved = false;

-- Add index for fetching unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_alerts_company_unacknowledged
  ON alerts(company_id, acknowledged)
  WHERE acknowledged = false;

COMMENT ON COLUMN alerts.alert_type IS 'Type of threshold crossed: warning, urgent, or breach';
COMMENT ON COLUMN alerts.days_used IS 'Number of days used in 180-day window when alert was created';
COMMENT ON COLUMN alerts.acknowledged IS 'Whether a user has acknowledged seeing this alert';
COMMENT ON COLUMN alerts.acknowledged_at IS 'Timestamp when the alert was acknowledged';
COMMENT ON COLUMN alerts.acknowledged_by IS 'User who acknowledged the alert';

-- ============================================================================
-- SECTION 2: NOTIFICATION LOG TABLE (Email Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,

  -- Email details
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Delivery tracking
  status TEXT NOT NULL DEFAULT 'pending',
  resend_message_id TEXT,
  error_message TEXT,

  -- Metadata
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT notification_log_type_check CHECK (notification_type IN ('warning', 'urgent', 'breach', 'resolution')),
  CONSTRAINT notification_log_status_check CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))
);

COMMENT ON TABLE notification_log IS 'Audit log of all email notifications sent for compliance alerts';
COMMENT ON COLUMN notification_log.id IS 'Unique identifier for the notification log entry';
COMMENT ON COLUMN notification_log.company_id IS 'Reference to the company';
COMMENT ON COLUMN notification_log.alert_id IS 'Reference to the alert that triggered this notification';
COMMENT ON COLUMN notification_log.employee_id IS 'Reference to the employee this notification concerns';
COMMENT ON COLUMN notification_log.notification_type IS 'Type of notification: warning, urgent, breach, or resolution';
COMMENT ON COLUMN notification_log.recipient_email IS 'Email address the notification was sent to';
COMMENT ON COLUMN notification_log.subject IS 'Email subject line';
COMMENT ON COLUMN notification_log.status IS 'Delivery status: pending, sent, failed, or bounced';
COMMENT ON COLUMN notification_log.resend_message_id IS 'Message ID from Resend for tracking';
COMMENT ON COLUMN notification_log.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN notification_log.sent_at IS 'Timestamp when the email was actually sent';

-- Indexes for notification_log
CREATE INDEX IF NOT EXISTS idx_notification_log_company_id ON notification_log(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_alert_id ON notification_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_employee_id ON notification_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_log
DROP POLICY IF EXISTS "Users can view notification logs from their company" ON notification_log;
CREATE POLICY "Users can view notification logs from their company"
  ON notification_log
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert notification logs to their company" ON notification_log;
CREATE POLICY "Users can insert notification logs to their company"
  ON notification_log
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update notification logs in their company" ON notification_log;
CREATE POLICY "Users can update notification logs in their company"
  ON notification_log
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- No delete policy - notification logs are immutable for audit purposes

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notification_log TO authenticated;

-- ============================================================================
-- SECTION 3: ENHANCE COMPANY SETTINGS FOR GRANULAR NOTIFICATION CONTROL
-- ============================================================================

-- Add granular notification settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS warning_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS urgent_email_enabled BOOLEAN DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS breach_email_enabled BOOLEAN DEFAULT true;

-- Rename existing threshold columns to be clearer (if they exist with old names)
-- warning_threshold becomes the days_used value that triggers warning (default 70)
-- critical_threshold becomes the days_used value that triggers urgent (default 85)

-- Update default values for better threshold naming
-- Note: breach is always at 90 days (non-configurable - legal requirement)
COMMENT ON COLUMN company_settings.warning_threshold IS 'Days used that triggers warning alert (default 70, range 50-85)';
COMMENT ON COLUMN company_settings.critical_threshold IS 'Days used that triggers urgent alert (default 85, range 60-89)';
COMMENT ON COLUMN company_settings.email_notifications IS 'Master switch for all email notifications';
COMMENT ON COLUMN company_settings.warning_email_enabled IS 'Whether to send emails for warning alerts';
COMMENT ON COLUMN company_settings.urgent_email_enabled IS 'Whether to send emails for urgent alerts';
COMMENT ON COLUMN company_settings.breach_email_enabled IS 'Whether to send emails for breach alerts (strongly recommended)';

-- Add constraint to ensure thresholds are valid
-- warning_threshold must be < critical_threshold must be < 90
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_settings_threshold_order'
  ) THEN
    ALTER TABLE company_settings ADD CONSTRAINT company_settings_threshold_order
      CHECK (warning_threshold < critical_threshold AND critical_threshold < 90);
  END IF;
END $$;

-- Add constraint for valid threshold ranges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_settings_threshold_ranges'
  ) THEN
    ALTER TABLE company_settings ADD CONSTRAINT company_settings_threshold_ranges
      CHECK (warning_threshold >= 50 AND warning_threshold <= 85 AND critical_threshold >= 60 AND critical_threshold <= 89);
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: NOTIFICATION PREFERENCES TABLE (per-user email preferences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Per-type preferences
  receive_warning_emails BOOLEAN DEFAULT true,
  receive_urgent_emails BOOLEAN DEFAULT true,
  receive_breach_emails BOOLEAN DEFAULT true,

  -- Unsubscribe token for GDPR compliance
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  unsubscribed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One preference record per user
  CONSTRAINT notification_preferences_user_unique UNIQUE (user_id)
);

COMMENT ON TABLE notification_preferences IS 'Per-user email notification preferences';
COMMENT ON COLUMN notification_preferences.user_id IS 'Reference to the user';
COMMENT ON COLUMN notification_preferences.company_id IS 'Reference to the company';
COMMENT ON COLUMN notification_preferences.receive_warning_emails IS 'Whether user wants warning emails';
COMMENT ON COLUMN notification_preferences.receive_urgent_emails IS 'Whether user wants urgent emails';
COMMENT ON COLUMN notification_preferences.receive_breach_emails IS 'Whether user wants breach emails';
COMMENT ON COLUMN notification_preferences.unsubscribe_token IS 'Token for one-click unsubscribe (GDPR)';
COMMENT ON COLUMN notification_preferences.unsubscribed_at IS 'If set, user has fully unsubscribed';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_company_id ON notification_preferences(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_unsubscribe_token ON notification_preferences(unsubscribe_token);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only manage their own preferences
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;

-- ============================================================================
-- SECTION 5: HELPER FUNCTION FOR UNSUBSCRIBE (SECURITY DEFINER)
-- ============================================================================

-- Function to unsubscribe via token (doesn't require auth - for email links)
CREATE OR REPLACE FUNCTION unsubscribe_by_token(token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_preferences
  SET
    receive_warning_emails = false,
    receive_urgent_emails = false,
    receive_breach_emails = false,
    unsubscribed_at = NOW(),
    updated_at = NOW()
  WHERE unsubscribe_token = token
    AND unsubscribed_at IS NULL;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION unsubscribe_by_token IS 'Allows users to unsubscribe from all emails via a token link (GDPR one-click unsubscribe)';

-- Grant execute to anon (for unsubscribe links that don't require login)
GRANT EXECUTE ON FUNCTION unsubscribe_by_token TO anon;
GRANT EXECUTE ON FUNCTION unsubscribe_by_token TO authenticated;

-- ============================================================================
-- SECTION 6: UPDATE EXISTING ALERTS TO HAVE ALERT_TYPE
-- ============================================================================

-- Set alert_type based on risk_level for existing alerts
UPDATE alerts
SET alert_type = CASE
  WHEN risk_level = 'red' THEN 'breach'
  WHEN risk_level = 'amber' THEN 'urgent'
  ELSE 'warning'
END
WHERE alert_type IS NULL;

-- Make alert_type NOT NULL after backfilling
ALTER TABLE alerts ALTER COLUMN alert_type SET NOT NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
