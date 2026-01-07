-- ============================================================================
-- Core Business Tables Migration for ComplyEUR
-- ============================================================================
-- This migration creates the core business tables for Schengen 90/180-day
-- compliance tracking: employees, trips, alerts, company_settings, audit_log,
-- and the schengen_countries reference table.
-- ============================================================================

-- ============================================================================
-- SECTION 1: SCHENGEN COUNTRIES REFERENCE TABLE (NO RLS)
-- ============================================================================

-- Create schengen_countries reference table
CREATE TABLE IF NOT EXISTS schengen_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_full_member BOOLEAN DEFAULT true
);

COMMENT ON TABLE schengen_countries IS 'Reference table of Schengen Area countries for travel tracking';
COMMENT ON COLUMN schengen_countries.code IS '2-letter ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN schengen_countries.name IS 'Full country name in English';
COMMENT ON COLUMN schengen_countries.is_full_member IS 'Whether the country is a full Schengen member (vs associated)';

-- Insert Schengen countries (upsert to be idempotent)
INSERT INTO schengen_countries (code, name, is_full_member) VALUES
  ('AT', 'Austria', true),
  ('BE', 'Belgium', true),
  ('CH', 'Switzerland', true),
  ('CZ', 'Czech Republic', true),
  ('DE', 'Germany', true),
  ('DK', 'Denmark', true),
  ('EE', 'Estonia', true),
  ('ES', 'Spain', true),
  ('FI', 'Finland', true),
  ('FR', 'France', true),
  ('GR', 'Greece', true),
  ('HR', 'Croatia', true),
  ('HU', 'Hungary', true),
  ('IS', 'Iceland', true),
  ('IT', 'Italy', true),
  ('LI', 'Liechtenstein', true),
  ('LT', 'Lithuania', true),
  ('LU', 'Luxembourg', true),
  ('LV', 'Latvia', true),
  ('MT', 'Malta', true),
  ('NL', 'Netherlands', true),
  ('NO', 'Norway', true),
  ('PL', 'Poland', true),
  ('PT', 'Portugal', true),
  ('SE', 'Sweden', true),
  ('SI', 'Slovenia', true),
  ('SK', 'Slovakia', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_full_member = EXCLUDED.is_full_member;

-- ============================================================================
-- SECTION 2: EMPLOYEES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE employees IS 'Employee records for travel compliance tracking (GDPR minimized)';
COMMENT ON COLUMN employees.id IS 'Unique identifier for the employee';
COMMENT ON COLUMN employees.company_id IS 'Reference to the company this employee belongs to';
COMMENT ON COLUMN employees.name IS 'Employee name (only personal data stored per GDPR minimization)';

-- Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
DROP POLICY IF EXISTS "Users can view employees from their company" ON employees;
CREATE POLICY "Users can view employees from their company"
  ON employees
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert employees to their company" ON employees;
CREATE POLICY "Users can insert employees to their company"
  ON employees
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update employees in their company" ON employees;
CREATE POLICY "Users can update employees in their company"
  ON employees
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete employees from their company" ON employees;
CREATE POLICY "Users can delete employees from their company"
  ON employees
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Updated_at trigger for employees
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  entry_date DATE NOT NULL,
  exit_date DATE NOT NULL,
  purpose TEXT,
  job_ref TEXT,
  is_private BOOLEAN DEFAULT false,
  ghosted BOOLEAN DEFAULT false,
  travel_days INTEGER GENERATED ALWAYS AS (exit_date - entry_date + 1) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT trips_exit_after_entry CHECK (exit_date >= entry_date),
  CONSTRAINT trips_country_code_length CHECK (char_length(country) = 2)
);

COMMENT ON TABLE trips IS 'Travel records for Schengen compliance tracking';
COMMENT ON COLUMN trips.id IS 'Unique identifier for the trip';
COMMENT ON COLUMN trips.employee_id IS 'Reference to the employee who took this trip';
COMMENT ON COLUMN trips.company_id IS 'Reference to the company (denormalized for query performance)';
COMMENT ON COLUMN trips.country IS '2-letter ISO country code for the destination';
COMMENT ON COLUMN trips.entry_date IS 'Date of entry into the Schengen area';
COMMENT ON COLUMN trips.exit_date IS 'Date of exit from the Schengen area';
COMMENT ON COLUMN trips.purpose IS 'Optional description of trip purpose';
COMMENT ON COLUMN trips.job_ref IS 'Optional job or project reference';
COMMENT ON COLUMN trips.is_private IS 'Whether this is a private (non-business) trip';
COMMENT ON COLUMN trips.ghosted IS 'If true, exclude this trip from compliance calculations';
COMMENT ON COLUMN trips.travel_days IS 'Auto-calculated number of days (inclusive)';

-- Indexes for trips
CREATE INDEX IF NOT EXISTS idx_trips_employee_id ON trips(employee_id);
CREATE INDEX IF NOT EXISTS idx_trips_company_id ON trips(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_entry_date ON trips(entry_date);
CREATE INDEX IF NOT EXISTS idx_trips_exit_date ON trips(exit_date);
CREATE INDEX IF NOT EXISTS idx_trips_employee_date_range ON trips(employee_id, entry_date, exit_date);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
DROP POLICY IF EXISTS "Users can view trips from their company" ON trips;
CREATE POLICY "Users can view trips from their company"
  ON trips
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert trips to their company" ON trips;
CREATE POLICY "Users can insert trips to their company"
  ON trips
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update trips in their company" ON trips;
CREATE POLICY "Users can update trips in their company"
  ON trips
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete trips from their company" ON trips;
CREATE POLICY "Users can delete trips from their company"
  ON trips
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Updated_at trigger for trips
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT alerts_risk_level_check CHECK (risk_level IN ('green', 'amber', 'red'))
);

COMMENT ON TABLE alerts IS 'Compliance alerts generated when employees approach or exceed limits';
COMMENT ON COLUMN alerts.id IS 'Unique identifier for the alert';
COMMENT ON COLUMN alerts.employee_id IS 'Reference to the employee this alert concerns';
COMMENT ON COLUMN alerts.company_id IS 'Reference to the company (denormalized for query performance)';
COMMENT ON COLUMN alerts.risk_level IS 'Severity level: green (ok), amber (warning), red (critical)';
COMMENT ON COLUMN alerts.message IS 'Human-readable alert message';
COMMENT ON COLUMN alerts.resolved IS 'Whether the alert has been resolved/acknowledged';
COMMENT ON COLUMN alerts.email_sent IS 'Whether an email notification was sent for this alert';
COMMENT ON COLUMN alerts.resolved_at IS 'Timestamp when the alert was resolved';

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_employee_id ON alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_employee_resolved ON alerts(employee_id, resolved);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alerts
DROP POLICY IF EXISTS "Users can view alerts from their company" ON alerts;
CREATE POLICY "Users can view alerts from their company"
  ON alerts
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert alerts to their company" ON alerts;
CREATE POLICY "Users can insert alerts to their company"
  ON alerts
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update alerts in their company" ON alerts;
CREATE POLICY "Users can update alerts in their company"
  ON alerts
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete alerts from their company" ON alerts;
CREATE POLICY "Users can delete alerts from their company"
  ON alerts
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- SECTION 5: COMPANY SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  retention_months INTEGER DEFAULT 36,
  warning_threshold INTEGER DEFAULT 75,
  critical_threshold INTEGER DEFAULT 85,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE company_settings IS 'Per-company configuration for compliance tracking';
COMMENT ON COLUMN company_settings.company_id IS 'Reference to the company (also serves as primary key)';
COMMENT ON COLUMN company_settings.retention_months IS 'How many months to retain trip data (GDPR compliance)';
COMMENT ON COLUMN company_settings.warning_threshold IS 'Days used in 180-day window before amber alert (default 75)';
COMMENT ON COLUMN company_settings.critical_threshold IS 'Days used in 180-day window before red alert (default 85)';
COMMENT ON COLUMN company_settings.email_notifications IS 'Whether to send email notifications for alerts';

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_settings
DROP POLICY IF EXISTS "Users can view their company settings" ON company_settings;
CREATE POLICY "Users can view their company settings"
  ON company_settings
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their company settings" ON company_settings;
CREATE POLICY "Users can insert their company settings"
  ON company_settings
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their company settings" ON company_settings;
CREATE POLICY "Users can update their company settings"
  ON company_settings
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their company settings" ON company_settings;
CREATE POLICY "Users can delete their company settings"
  ON company_settings
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Updated_at trigger for company_settings
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 6: AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Audit trail of all actions performed in the system';
COMMENT ON COLUMN audit_log.id IS 'Unique identifier for the audit entry';
COMMENT ON COLUMN audit_log.company_id IS 'Reference to the company';
COMMENT ON COLUMN audit_log.user_id IS 'Reference to the user who performed the action (null if system)';
COMMENT ON COLUMN audit_log.action IS 'Action performed (e.g., trip.created, employee.deleted)';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected (e.g., trip, employee)';
COMMENT ON COLUMN audit_log.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_log.details IS 'JSON object with before/after state or additional context';
COMMENT ON COLUMN audit_log.ip_address IS 'IP address of the client (if available)';

-- Indexes for audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_company_id ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_log
DROP POLICY IF EXISTS "Users can view audit logs from their company" ON audit_log;
CREATE POLICY "Users can view audit logs from their company"
  ON audit_log
  FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert audit logs to their company" ON audit_log;
CREATE POLICY "Users can insert audit logs to their company"
  ON audit_log
  FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update audit logs in their company" ON audit_log;
CREATE POLICY "Users can update audit logs in their company"
  ON audit_log
  FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete audit logs from their company" ON audit_log;
CREATE POLICY "Users can delete audit logs from their company"
  ON audit_log
  FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- SECTION 7: EMPLOYEE COMPLIANCE SUMMARY VIEW
-- ============================================================================

-- Drop and recreate view to ensure it's up to date
DROP VIEW IF EXISTS employee_compliance_summary;

CREATE VIEW employee_compliance_summary AS
SELECT
  e.id AS employee_id,
  e.name AS employee_name,
  e.company_id,
  COUNT(t.id) AS total_trips,
  COALESCE(SUM(CASE WHEN t.ghosted = false THEN t.travel_days ELSE 0 END), 0) AS total_travel_days,
  MAX(t.exit_date) AS last_trip_end
FROM employees e
LEFT JOIN trips t ON t.employee_id = e.id
GROUP BY e.id, e.name, e.company_id;

COMMENT ON VIEW employee_compliance_summary IS 'Aggregated compliance data per employee for dashboard display';

-- ============================================================================
-- SECTION 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on the view to authenticated users
GRANT SELECT ON employee_compliance_summary TO authenticated;

-- Grant permissions on new tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_log TO authenticated;
GRANT SELECT ON schengen_countries TO authenticated;

-- Also grant to anon for the reference table (public read)
GRANT SELECT ON schengen_countries TO anon;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
