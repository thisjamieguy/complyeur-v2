-- ============================================================
-- DIAGNOSTIC: Find trips likely created by the IES→IE parser bug
-- ============================================================
-- The bug: Cells like "PAC-IES-ClientName" were parsed as Ireland (IE)
-- because the parser extracted the first 2 letters of "IES"
--
-- Suspicious pattern:
-- 1. Single-day trips (entry_date = exit_date)
-- 2. To Ireland (IE) specifically - the main culprit
-- 3. Possibly also GB from "GBR" patterns
-- ============================================================

-- STEP 1: Find all suspicious 1-day Ireland trips
-- These are almost certainly from the parser bug
SELECT
  e.name as employee_name,
  t.id as trip_id,
  t.country,
  t.entry_date,
  t.exit_date,
  t.purpose,
  t.created_at
FROM trips t
JOIN employees e ON t.employee_id = e.id
WHERE t.country = 'IE'
  AND t.entry_date = t.exit_date  -- Single day trips
  AND e.deleted_at IS NULL
ORDER BY e.name, t.entry_date DESC;

-- STEP 2: Count by employee (to see scope)
SELECT
  e.name as employee_name,
  COUNT(*) as suspicious_ie_trips
FROM trips t
JOIN employees e ON t.employee_id = e.id
WHERE t.country = 'IE'
  AND t.entry_date = t.exit_date
  AND e.deleted_at IS NULL
GROUP BY e.name
ORDER BY suspicious_ie_trips DESC;

-- STEP 3: Also check for suspicious 1-day GB trips (from "GBR" codes)
SELECT
  e.name as employee_name,
  t.id as trip_id,
  t.country,
  t.entry_date,
  t.exit_date,
  t.purpose,
  t.created_at
FROM trips t
JOIN employees e ON t.employee_id = e.id
WHERE t.country = 'GB'
  AND t.entry_date = t.exit_date  -- Single day trips
  AND e.deleted_at IS NULL
ORDER BY e.name, t.entry_date DESC;

-- ============================================================
-- CLEANUP: Delete the suspicious trips (RUN AFTER REVIEWING ABOVE)
-- ============================================================
-- IMPORTANT: Review the SELECT results first before running DELETE!
-- Uncomment the DELETE statements below only after confirming the list

-- DELETE 1-day Ireland trips (high confidence these are bugs)
-- DELETE FROM trips
-- WHERE country = 'IE'
--   AND entry_date = exit_date;

-- DELETE 1-day GB trips (review carefully - some might be legitimate)
-- DELETE FROM trips
-- WHERE country = 'GB'
--   AND entry_date = exit_date;
