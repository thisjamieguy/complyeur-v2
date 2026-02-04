-- Setup script for creating load test users in Supabase
-- Run this in your Supabase SQL Editor before load testing

-- Create test companies (these will be the auth users)
-- NOTE: You'll need to create these users through Supabase Auth UI or API
-- This SQL just sets up the company records after users are created

-- Example company records for test users
-- Replace the UUID with actual auth.uid() values after creating test users

-- Test Company 1
INSERT INTO companies (id, name, email, created_at)
VALUES
  ('REPLACE_WITH_AUTH_UID_1', 'LoadTest Company 1', 'loadtest1@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test Company 2
INSERT INTO companies (id, name, email, created_at)
VALUES
  ('REPLACE_WITH_AUTH_UID_2', 'LoadTest Company 2', 'loadtest2@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test Company 3
INSERT INTO companies (id, name, email, created_at)
VALUES
  ('REPLACE_WITH_AUTH_UID_3', 'LoadTest Company 3', 'loadtest3@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test Company 4
INSERT INTO companies (id, name, email, created_at)
VALUES
  ('REPLACE_WITH_AUTH_UID_4', 'LoadTest Company 4', 'loadtest4@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test Company 5
INSERT INTO companies (id, name, email, created_at)
VALUES
  ('REPLACE_WITH_AUTH_UID_5', 'LoadTest Company 5', 'loadtest5@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create sample employees for each company (optional - makes tests more realistic)
-- This creates 3 employees per test company

DO $$
DECLARE
  company_record RECORD;
  i INTEGER;
BEGIN
  FOR company_record IN
    SELECT id, name FROM companies WHERE email LIKE 'loadtest%@example.com'
  LOOP
    FOR i IN 1..3 LOOP
      INSERT INTO employees (company_id, name, passport_number, nationality, created_at)
      VALUES (
        company_record.id,
        'Test Employee ' || i || ' - ' || company_record.name,
        'TEST' || LPAD(i::text, 6, '0'),
        'GB',
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- Create sample trips for realistic data
-- Each employee gets 2-3 trips in the past 6 months

DO $$
DECLARE
  employee_record RECORD;
  trip_count INTEGER;
BEGIN
  FOR employee_record IN
    SELECT e.id, e.company_id
    FROM employees e
    JOIN companies c ON e.company_id = c.id
    WHERE c.email LIKE 'loadtest%@example.com'
  LOOP
    trip_count := 2 + (random() * 2)::integer; -- 2-3 trips per employee

    FOR i IN 1..trip_count LOOP
      INSERT INTO trips (
        employee_id,
        company_id,
        start_date,
        end_date,
        destination,
        created_at
      )
      VALUES (
        employee_record.id,
        employee_record.company_id,
        (NOW() - (random() * interval '180 days'))::date,
        (NOW() - (random() * interval '180 days') + interval '7 days')::date,
        CASE (random() * 3)::integer
          WHEN 0 THEN 'France'
          WHEN 1 THEN 'Germany'
          WHEN 2 THEN 'Spain'
          ELSE 'Italy'
        END,
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

-- Verify test data
SELECT
  c.name as company,
  COUNT(DISTINCT e.id) as employees,
  COUNT(t.id) as trips
FROM companies c
LEFT JOIN employees e ON c.id = e.company_id
LEFT JOIN trips t ON e.id = t.employee_id
WHERE c.email LIKE 'loadtest%@example.com'
GROUP BY c.id, c.name;
