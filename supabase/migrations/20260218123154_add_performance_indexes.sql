-- Phase 5: Database Optimisation — Performance Indexes
-- H-09: Composite index for hasActiveAlertOfType() queries
-- M-09: Trigram index for employee name ILIKE search
-- M-10: Composite index for forecast queries on trips(company_id, entry_date)

-- H-09: alerts(employee_id, alert_type, resolved) partial index
-- Targets: hasActiveAlertOfType() which filters on all three columns
-- Existing idx_alerts_employee_resolved covers (employee_id, resolved) but not alert_type
CREATE INDEX IF NOT EXISTS idx_alerts_employee_type_resolved
ON alerts (employee_id, alert_type, resolved)
WHERE resolved = false;

-- M-09: Trigram index for employee name search (ILIKE with leading %)
-- Requires pg_trgm extension for gin_trgm_ops operator class
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_employees_name_trgm
ON employees USING gin (name gin_trgm_ops)
WHERE deleted_at IS NULL;

-- M-10: Composite index for forecast queries filtering on (company_id, entry_date)
-- Targets: trip forecast queries that filter by company and date range
CREATE INDEX IF NOT EXISTS idx_trips_company_entry_date
ON trips (company_id, entry_date)
WHERE ghosted = false;
