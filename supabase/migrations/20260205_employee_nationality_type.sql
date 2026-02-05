-- Add nationality_type column to employees table
-- Tracks whether an employee is a UK citizen, EU/Schengen citizen, or rest of world.
-- EU/Schengen citizens are exempt from 90/180-day compliance tracking.

ALTER TABLE employees
  ADD COLUMN nationality_type TEXT NOT NULL DEFAULT 'uk_citizen';

-- Restrict values to the three valid nationality types
ALTER TABLE employees
  ADD CONSTRAINT employees_nationality_type_check
  CHECK (nationality_type IN ('uk_citizen', 'eu_schengen_citizen', 'rest_of_world'));
