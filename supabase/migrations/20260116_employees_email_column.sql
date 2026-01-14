-- Migration: Add email column to employees table
-- Purpose: Enable email-based employee lookup for trip imports

-- Add email column to employees table
ALTER TABLE employees
ADD COLUMN email TEXT;

-- Create index for email lookups (case-insensitive)
CREATE INDEX idx_employees_email_lower ON employees (LOWER(email));

-- Add unique constraint per company (employees within same company must have unique emails)
CREATE UNIQUE INDEX idx_employees_company_email ON employees (company_id, LOWER(email))
WHERE email IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN employees.email IS 'Employee email address for identification and trip import matching';
