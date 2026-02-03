# Comprehensive Test Suite Design — ComplyEUR

**Date:** 2025-02-03
**Status:** Ready for Implementation
**Goal:** Maximum test coverage at every layer for the core 90/180-day calculation and import feature

---

## Executive Summary

This document defines a 4-layer test suite to exhaustively verify ComplyEUR's core business function: tracking Schengen visa compliance via the 90/180-day rule.

**Current State:**
- 642 unit/integration tests (55% coverage)
- 17 E2E tests (basic page loads only)
- Database stress test completed (150K days, 0 discrepancies)

**Target State:**
- ~765 total tests (123 new)
- 90%+ coverage on critical compliance code
- Full E2E import workflow coverage
- UI-level stress testing with oracle comparison

---

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: E2E Stress Tests (Playwright)                      │
│ - Upload 500-row CSV through UI                             │
│ - Verify all data appears on dashboard                      │
│ - Compare displayed values against oracle                   │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: E2E Functional Tests (Playwright)                  │
│ - Full import workflow (upload → preview → confirm)         │
│ - Edge cases (duplicate handling, validation errors)        │
│ - Dashboard verification after import                       │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Integration Tests (Vitest)                         │
│ - Parser → Validator → Inserter pipeline                    │
│ - Import API endpoint testing                               │
│ - Database triggers and computed columns                    │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Unit Tests (Vitest)                                │
│ - Fill coverage gaps (cached.ts, compliance-vector.ts)      │
│ - Edge case calculations (boundary days, overlaps)          │
│ - Error handling paths                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Execution Procedure

### Prerequisites

Before starting, ensure:
- [ ] Node.js 20+ installed
- [ ] All dependencies installed (`npm ci`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] Supabase dev/test environment available
- [ ] Environment variables configured (`.env.local`)

### Phase 0: Infrastructure Setup (30 min)

**Run Prompt 8 first to set up test infrastructure.**

```bash
# Verify current tests pass
npm run test
npm run test:e2e

# Check baseline coverage
npm run test:coverage
```

**Success Criteria:**
- [ ] All 642 existing tests pass
- [ ] All 17 E2E tests pass
- [ ] Coverage report generates without error
- [ ] New npm scripts added to package.json

### Phase 1: Unit Test Gap Coverage (2-3 hours)

**Run Prompt 1 to fill unit test gaps.**

```bash
# Run specific file tests during development
npm run test -- lib/compliance/__tests__/cached.test.ts
npm run test -- lib/compliance/__tests__/compliance-vector.test.ts

# Verify coverage improvement
npm run test:coverage
```

**Success Criteria:**
- [ ] `cached.ts` coverage: 2% → 90%+
- [ ] `compliance-vector.ts` coverage: 0% → 90%+
- [ ] `risk-calculator.ts` coverage: 61% → 95%+
- [ ] `safe-entry.ts` coverage: 73% → 95%+
- [ ] All new tests pass
- [ ] No regressions in existing tests

### Phase 2: Integration Tests (2-3 hours)

**Run Prompts 2, 3, and 4 for integration tests.**

```bash
# Run integration tests
npm run test:integration

# Or run specific suites
npm run test -- __tests__/integration/import-pipeline.test.ts
npm run test -- __tests__/integration/import-insertion.test.ts
npm run test -- __tests__/integration/import-api.test.ts
```

**Success Criteria:**
- [ ] Parser pipeline tests pass (all file formats)
- [ ] Database insertion tests pass (with cleanup)
- [ ] API endpoint tests pass (auth + validation)
- [ ] No orphaned test data in database

### Phase 3: E2E Functional Tests (2-3 hours)

**Run Prompts 5 and 6 for E2E functional tests.**

```bash
# Start dev server (if not auto-started by Playwright)
npm run dev &

# Run E2E tests
npm run test:e2e:import
npm run test:e2e:dashboard

# Debug failures with UI mode
npx playwright test --ui
```

**Success Criteria:**
- [ ] Complete import workflow passes (employee + trip)
- [ ] Validation error display works
- [ ] Column remapping works
- [ ] Dashboard displays correct values (oracle verified)
- [ ] Filters, search, sort all work
- [ ] Videos recorded for any failures

### Phase 4: E2E Stress Tests (1-2 hours)

**Run Prompt 7 for stress tests.**

```bash
# Run stress tests (extended timeout)
npm run test:e2e:stress

# Or with verbose output
npx playwright test e2e/stress-test.spec.ts --timeout=300000 --reporter=list
```

**Success Criteria:**
- [ ] 500-row import completes without error
- [ ] Import completes in under 60 seconds
- [ ] Dashboard values match oracle (0 discrepancies)
- [ ] Dashboard loads in under 5 seconds with 10K trips
- [ ] Concurrent imports don't corrupt data
- [ ] Stress test report generated

### Phase 5: Final Verification (30 min)

```bash
# Run entire test suite
npm run test:all

# Generate combined report
npm run test:report

# Review report
open test-reports/combined-report.html
```

**Success Criteria:**
- [ ] All tests pass (unit + integration + E2E)
- [ ] Coverage above 80% overall
- [ ] Coverage above 90% for compliance/ directory
- [ ] Combined report shows all green
- [ ] No calculation discrepancies at any layer

---

## Prompts

### Prompt 0: Infrastructure Setup

```
TASK: Set up test infrastructure, scripts, and reporting

REQUIREMENTS:
1. Add npm scripts for each test layer
2. Create combined test runner
3. Set up HTML report generation
4. Configure CI pipeline (if using GitHub Actions)

UPDATE package.json scripts:
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run lib/compliance/__tests__ __tests__/unit",
    "test:integration": "vitest run __tests__/integration",
    "test:e2e": "playwright test e2e/",
    "test:e2e:import": "playwright test e2e/import-workflow.spec.ts",
    "test:e2e:dashboard": "playwright test e2e/dashboard-verification.spec.ts",
    "test:e2e:stress": "playwright test e2e/stress-test.spec.ts --timeout=300000",
    "test:coverage": "vitest run --coverage",
    "test:all": "npm run test:coverage && npm run test:e2e",
    "test:report": "node scripts/generate-test-report.js"
  }
}

CREATE: scripts/generate-test-report.js
- Combines coverage report, Vitest results, Playwright results
- Generates single HTML dashboard
- Shows pass/fail counts per layer
- Highlights any discrepancies from stress tests
- Outputs to test-reports/combined-report.html

CREATE: .github/workflows/test.yml (if using GitHub Actions)
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        with:
          name: test-reports
          path: |
            coverage/
            playwright-report/
            test-reports/

CREATE: Test data fixtures directory
__tests__/fixtures/
  - valid-employees.csv
  - valid-trips.csv
  - invalid-employees.csv (for error testing)
  - invalid-trips.csv
  - edge-case-dates.csv (boundary dates)
  - overlapping-trips.csv
  - large-batch-employees.csv (500 rows)

CREATE: Shared test utilities
__tests__/utils/
  - csv-generator.ts (generate test CSV files)
  - oracle-calculator.ts (independent calculation for comparison)
  - test-data-cleanup.ts (delete test records after tests)
  - playwright-helpers.ts (common page interactions)

UPDATE: vitest.config.ts
- Add coverage thresholds (fail if below 80%)
- Add reporters for CI integration

UPDATE: playwright.config.ts
- Add stress test project with extended timeout
- Configure video recording on failure
- Configure trace recording for debugging
```

---

### Prompt 1: Unit Test Gap Coverage (Layer 1)

```
TASK: Fill unit test coverage gaps in ComplyEUR compliance library

TARGET FILES:
- lib/compliance/cached.ts (currently 2% → target 90%)
- lib/compliance/compliance-vector.ts (currently 0% → target 90%)
- lib/compliance/risk-calculator.ts (currently 61% → target 95%)
- lib/compliance/safe-entry.ts (currently 73% → target 95%)

CREATE TEST FILES:
- lib/compliance/__tests__/cached.test.ts
- lib/compliance/__tests__/compliance-vector.test.ts
- (extend existing risk-calculator.test.ts and safe-entry.test.ts)

REQUIREMENTS:
1. Read each source file completely before writing tests
2. Test every exported function
3. Test every code branch (if/else, switch cases, early returns)
4. Test error handling paths
5. Include edge cases: empty inputs, null values, boundary conditions
6. Use existing test patterns from lib/compliance/__tests__/presence-calculator.test.ts
7. Use test factories from __tests__/utils/factories.ts
8. Every test must include an independent "oracle" calculation to verify expected values

SPECIFIC TEST CASES FOR cached.ts:
- getCachedCompliance() returns cached result on second call
- Cache invalidates when trips array changes
- Cache invalidates when reference date changes
- batchCalculateCompliance() processes multiple employees
- createComplianceCalculator() returns reusable calculator
- Handles empty trips array
- Handles undefined/null inputs gracefully

SPECIFIC TEST CASES FOR compliance-vector.ts:
- computeComplianceVector() returns daily compliance for date range
- Correctly handles gaps between trips
- computeMonthCompliance() aggregates daily values
- computeYearCompliance() aggregates monthly values
- Identifies worst compliance day in range
- Handles employee with no trips
- Handles trips spanning multiple months
- Handles reference date at start/middle/end of range

RUN AFTER: npm run test:coverage -- --reporter=verbose
VERIFY: Coverage for these files reaches target percentages
```

---

### Prompt 2: Integration Tests — Parser Pipeline (Layer 2A)

```
TASK: Create integration tests for the import parser pipeline

CREATE FILE: __tests__/integration/import-pipeline.test.ts

REQUIREMENTS:
1. Test the full flow: raw file → parser → validator → ready for insert
2. Use real implementations (not mocks) for parser.ts, validator.ts
3. Test with actual CSV/Excel file buffers, not just parsed objects
4. Cover all supported formats: Employee CSV, Trip CSV, Gantt/Schedule

TEST STRUCTURE:

describe('Import Pipeline Integration', () => {
  describe('CSV Parsing', () => {
    - parses valid employee CSV with columns: name, email, passport, nationality
    - parses valid trip CSV with columns: email, entry_date, exit_date, country
    - handles multiple date formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, Excel serial
    - handles BOM characters in UTF-8 files (prepend \uFEFF to test data)
    - handles quoted fields with commas inside
    - handles empty rows gracefully (skips them)
    - rejects completely malformed CSV (returns meaningful error)
    - sanitizes CSV injection attempts: fields starting with =, @, +, -
  })

  describe('Excel Parsing', () => {
    - parses .xlsx file with employee data
    - parses .xlsx file with trip data
    - handles multiple sheets (uses first sheet by default)
    - handles formatted dates in Excel
  })

  describe('Validation Chain', () => {
    - returns structured ValidationResult with errors and warnings arrays
    - validates required fields present (name, email for employees)
    - validates email format
    - validates date format and logic (exit >= entry)
    - validates country codes (rejects invalid codes like 'XX')
    - detects duplicate employees by email (returns warning)
    - detects duplicate trips by employee+date range
    - validates passport number format if provided
  })
})

HELPER: Create test CSV content inline:
const testCSV = `name,email,passport,nationality
John Doe,john@test.com,AB123456,GB
Jane Smith,jane@test.com,CD789012,US`;

USE: lib/import/parser.ts parseFile() and parseCSV()
USE: lib/import/validator.ts validateEmployeeRows(), validateTripRows()

RUN: npm run test -- __tests__/integration/import-pipeline.test.ts
```

---

### Prompt 3: Integration Tests — Database Insertion (Layer 2B)

```
TASK: Create integration tests for database insertion after import

CREATE FILE: __tests__/integration/import-insertion.test.ts

REQUIREMENTS:
1. These tests interact with a real Supabase database (use test/dev environment)
2. Each test must clean up after itself (delete created records)
3. Use a dedicated test company to isolate from real data
4. Test RLS policies are enforced

SETUP:
- Create test company before all tests
- Create test user session/auth context
- Delete test company and all related data after all tests

TEST STRUCTURE:

describe('Import Database Insertion', () => {
  describe('Employee Insertion', () => {
    - inserts single employee with all fields
    - inserts batch of employees (10+)
    - sets correct company_id from session
    - handles duplicate email with strategy 'skip' (doesn't insert)
    - handles duplicate email with strategy 'update' (updates existing)
    - rejects insert if company_id doesn't match session (RLS)
    - rolls back entire batch if one fails (transaction)
  })

  describe('Trip Insertion', () => {
    - inserts single trip linked to employee
    - inserts batch of trips (50+)
    - sets correct company_id from session
    - validates employee_id exists before insert
    - computes travel_days correctly (generated column)
    - handles duplicate trip detection
    - rejects insert to other company's employee (RLS)
  })

  describe('Post-Insert Calculations', () => {
    - after inserting trips, employee compliance recalculates
    - days_used reflects all inserted trips
    - overlapping trips are deduplicated in calculation
    - non-Schengen trips don't count toward days_used
  })
})

USE: lib/import/inserter.ts or direct Supabase client
REFERENCE: scripts/stress-test/insert-data.ts for patterns

IMPORTANT: Use beforeAll/afterAll for setup/teardown to avoid orphaned test data
```

---

### Prompt 4: Integration Tests — API Endpoints (Layer 2C)

```
TASK: Create integration tests for import API endpoints

CREATE FILE: __tests__/integration/import-api.test.ts

REQUIREMENTS:
1. Test actual API routes, not mocked handlers
2. Use fetch or a test client to call endpoints
3. Test authentication and authorization
4. Test request validation and error responses

TEST STRUCTURE:

describe('Import API Endpoints', () => {
  describe('POST /api/import/upload', () => {
    - accepts multipart form data with file
    - returns parsed preview data
    - returns 400 for invalid file type
    - returns 400 for file exceeding 10MB
    - returns 401 for unauthenticated request
    - returns file_id for subsequent steps
  })

  describe('POST /api/import/validate', () => {
    - accepts file_id and returns validation results
    - returns structured errors array
    - returns structured warnings array
    - returns row count and preview
  })

  describe('POST /api/import/confirm', () => {
    - accepts file_id and options (duplicate strategy)
    - inserts validated data to database
    - returns success with inserted counts
    - returns 400 if validation not completed
    - returns partial success if some rows fail
  })

  describe('Authentication & Authorization', () => {
    - all endpoints require valid session
    - cannot access another company's import session
    - rate limiting prevents abuse (if implemented)
  })
})

SETUP:
- Start Next.js dev server or use test server
- Create authenticated session for requests
- Use actual HTTP requests (fetch or supertest pattern)

REFERENCE: Check app/(dashboard)/import/actions.ts for server actions
REFERENCE: Check app/api/import/ for API routes if they exist
```

---

### Prompt 5: E2E Functional Tests — Import Workflow (Layer 3A)

```
TASK: Create Playwright E2E tests for the import workflow

CREATE FILE: e2e/import-workflow.spec.ts

REQUIREMENTS:
1. Test the complete user journey through the import UI
2. Use real browser automation (Playwright)
3. Create test data files in the scratchpad directory
4. Clean up imported data after tests
5. Use authenticated session (login before tests)

TEST STRUCTURE:

import { test, expect } from '@playwright/test';

test.describe('Import Workflow E2E', () => {
  test.beforeAll(async () => {
    // Login and create authenticated state
    // Generate test CSV files
  });

  test.afterAll(async () => {
    // Clean up imported test data
  });

  test.describe('Employee Import', () => {
    test('completes full employee import workflow', async ({ page }) => {
      // 1. Navigate to /import
      // 2. Select "Employees" format
      // 3. Upload test CSV file
      // 4. Verify preview table shows correct data
      // 5. Confirm column mappings
      // 6. Select date format if prompted
      // 7. Choose duplicate handling strategy
      // 8. Click confirm/import
      // 9. Verify success page shows correct count
      // 10. Navigate to /employees
      // 11. Verify imported employees appear in list
    });

    test('shows validation errors for invalid data', async ({ page }) => {
      // Upload CSV with invalid emails, missing fields
      // Verify error messages appear inline
      // Verify import button is disabled until fixed
    });

    test('allows column remapping', async ({ page }) => {
      // Upload CSV with non-standard headers
      // Verify mapping UI appears
      // Change column mappings
      // Verify preview updates
    });
  });

  test.describe('Trip Import', () => {
    test('completes full trip import workflow', async ({ page }) => {
      // Similar to employee but for trips
      // Verify trips linked to correct employees
    });

    test('shows warning for unmatched employee emails', async ({ page }) => {
      // Upload trips for employees that don't exist
      // Verify warning banner appears
    });

    test('validates date ranges', async ({ page }) => {
      // Upload trip where exit_date < entry_date
      // Verify error message
    });
  });
});

GENERATE TEST FILES:
Create helper function to generate CSV files:
- /scratchpad/test-employees.csv (10 valid employees)
- /scratchpad/test-employees-invalid.csv (with errors)
- /scratchpad/test-trips.csv (20 valid trips)

PLAYWRIGHT HELPERS:
- Use page.setInputFiles() for file upload
- Use page.waitForURL() for navigation assertions
- Use expect(page.getByRole(...)).toBeVisible() for element checks

RUN: npm run test:e2e -- e2e/import-workflow.spec.ts
```

---

### Prompt 6: E2E Functional Tests — Dashboard Verification (Layer 3B)

```
TASK: Create Playwright E2E tests verifying dashboard after import

CREATE FILE: e2e/dashboard-verification.spec.ts

REQUIREMENTS:
1. Import known test data with pre-calculated expected values
2. Navigate to dashboard and verify displayed values match expected
3. Test all dashboard features: filters, search, sort, detail views
4. This is the critical "oracle comparison" at the UI level

TEST STRUCTURE:

test.describe('Dashboard Verification E2E', () => {
  // Test data with known expected outcomes
  const TEST_EMPLOYEES = [
    { name: 'Green Employee', trips: [...], expected: { daysUsed: 30, daysRemaining: 60, status: 'green' } },
    { name: 'Amber Employee', trips: [...], expected: { daysUsed: 70, daysRemaining: 20, status: 'amber' } },
    { name: 'Red Employee', trips: [...], expected: { daysUsed: 85, daysRemaining: 5, status: 'red' } },
    { name: 'Breach Employee', trips: [...], expected: { daysUsed: 95, daysRemaining: -5, status: 'breach' } },
  ];

  test.beforeAll(async () => {
    // Import TEST_EMPLOYEES data via API or UI
  });

  test('displays correct days remaining for each employee', async ({ page }) => {
    await page.goto('/dashboard');

    for (const emp of TEST_EMPLOYEES) {
      const row = page.getByRole('row', { name: new RegExp(emp.name) });
      const daysCell = row.getByTestId('days-remaining');
      await expect(daysCell).toHaveText(String(emp.expected.daysRemaining));
    }
  });

  test('displays correct status badges', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify green badge for Green Employee
    // Verify amber badge for Amber Employee
    // etc.
  });

  test('status filters work correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Click "At Risk" filter
    await page.getByRole('button', { name: /at risk/i }).click();

    // Verify only amber/red employees shown
    await expect(page.getByText('Green Employee')).not.toBeVisible();
    await expect(page.getByText('Amber Employee')).toBeVisible();
  });

  test('search finds employees', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByPlaceholder(/search/i).fill('Breach');
    await expect(page.getByText('Breach Employee')).toBeVisible();
    await expect(page.getByText('Green Employee')).not.toBeVisible();
  });

  test('sort by compliance orders correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('combobox', { name: /sort/i }).selectOption('compliance');

    // Verify order: Breach first, then Red, Amber, Green (ascending remaining days)
    const rows = await page.getByRole('row').all();
    // Assert order
  });

  test('employee detail shows all trips', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('Green Employee').click();

    // Verify trip list appears
    // Verify trip count matches expected
    // Verify trip dates and countries displayed
  });
});

CRITICAL: The expected values must be independently calculated (oracle), not copied from what the UI currently shows.
```

---

### Prompt 7: E2E Stress Tests (Layer 4)

```
TASK: Create Playwright E2E stress tests pushing the UI to maximum capacity

CREATE FILE: e2e/stress-test.spec.ts

REQUIREMENTS:
1. Test with maximum allowed data through the UI
2. Measure performance (load times, responsiveness)
3. Verify accuracy at scale with oracle comparison
4. Test concurrent operations

TEST STRUCTURE:

test.describe('E2E Stress Tests', () => {
  test.describe('Maximum Load Import', () => {
    test('imports 500-row employee CSV (UI limit)', async ({ page }) => {
      // 1. Generate 500 employees with seeded random
      const csv = generateEmployeeCSV({ count: 500, seed: 12345 });
      await writeFile('/scratchpad/stress-employees.csv', csv);

      // 2. Navigate to import
      await page.goto('/import');

      // 3. Upload file
      await page.setInputFiles('input[type="file"]', '/scratchpad/stress-employees.csv');

      // 4. Complete workflow (time it)
      const startTime = Date.now();
      // ... complete import steps
      const duration = Date.now() - startTime;

      // 5. Verify all 500 appear
      await page.goto('/employees');
      await expect(page.getByText('500 employees')).toBeVisible();

      // 6. Log performance
      console.log(`500 employee import completed in ${duration}ms`);
      expect(duration).toBeLessThan(60000); // Under 1 minute
    });

    test('imports maximum trips (multiple 500-row batches)', async ({ page }) => {
      // Generate 2000 trips across 4 CSV files
      // Import each batch
      // Verify total trip count
    });
  });

  test.describe('Calculation Accuracy at Scale', () => {
    test('dashboard values match oracle for 100 employees with complex trips', async ({ page }) => {
      // 1. Generate test data with known expected values
      const testData = generateStressTestData({
        employees: 100,
        tripsPerEmployee: 50,
        seed: 54321
      });

      // 2. Insert via API (faster than UI for setup)
      await insertTestData(testData);

      // 3. Navigate to dashboard
      await page.goto('/dashboard');

      // 4. Extract displayed values
      const actualValues = await extractDashboardValues(page);

      // 5. Compare against oracle
      const discrepancies = compareWithOracle(actualValues, testData.expected);

      // 6. Generate report
      if (discrepancies.length > 0) {
        await generateDiscrepancyReport(discrepancies);
        throw new Error(`${discrepancies.length} calculation discrepancies found`);
      }
    });
  });

  test.describe('Performance Under Load', () => {
    test('dashboard loads within 5 seconds with 10,000 trips', async ({ page }) => {
      // Pre-insert large dataset
      // Measure page load time
      // Measure scroll performance
      // Measure filter/search responsiveness
    });

    test('no memory leaks during extended use', async ({ page }) => {
      // Navigate between pages repeatedly
      // Monitor memory usage
      // Verify no degradation
    });
  });

  test.describe('Concurrent Operations', () => {
    test('handles 3 simultaneous imports without data corruption', async ({ browser }) => {
      // Create 3 browser contexts (simulating 3 users)
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext(),
      ]);

      // Each context logs in as different test user
      // Each uploads different CSV simultaneously
      // All complete successfully
      // Each user sees only their own data (RLS)

      // Cleanup contexts
    });
  });
});

HELPER FUNCTIONS NEEDED:
- generateEmployeeCSV(options) - creates CSV string
- generateTripCSV(options) - creates CSV string
- generateStressTestData(options) - creates data with expected values
- insertTestData(data) - inserts via Supabase client (bypass UI)
- extractDashboardValues(page) - scrapes displayed values
- compareWithOracle(actual, expected) - returns discrepancies
- generateDiscrepancyReport(discrepancies) - creates HTML report

RUN: npm run test:e2e -- e2e/stress-test.spec.ts --timeout=300000
```

---

## Quick Reference

### Commands

```bash
# Run all tests
npm run test:all

# Run specific layers
npm run test:unit           # Layer 1
npm run test:integration    # Layer 2
npm run test:e2e            # Layers 3 & 4
npm run test:e2e:stress     # Layer 4 only

# Coverage
npm run test:coverage

# Generate report
npm run test:report
```

### Files Created

| File | Layer | Tests |
|------|-------|-------|
| `lib/compliance/__tests__/cached.test.ts` | 1 | ~15 |
| `lib/compliance/__tests__/compliance-vector.test.ts` | 1 | ~20 |
| `__tests__/integration/import-pipeline.test.ts` | 2A | ~15 |
| `__tests__/integration/import-insertion.test.ts` | 2B | ~12 |
| `__tests__/integration/import-api.test.ts` | 2C | ~10 |
| `e2e/import-workflow.spec.ts` | 3A | ~15 |
| `e2e/dashboard-verification.spec.ts` | 3B | ~10 |
| `e2e/stress-test.spec.ts` | 4 | ~8 |
| **Total** | | **~123** |

### Success Metrics

| Metric | Target |
|--------|--------|
| Overall test count | 765+ |
| Overall coverage | 80%+ |
| Compliance lib coverage | 90%+ |
| E2E pass rate | 100% |
| Stress test discrepancies | 0 |
| Max import time (500 rows) | < 60s |
| Dashboard load (10K trips) | < 5s |

---

## Troubleshooting

### Common Issues

**Tests timeout:**
- Increase timeout in playwright.config.ts
- Check dev server is running
- Check network/database connectivity

**Coverage not improving:**
- Verify test file is being discovered (check vitest.config.ts include patterns)
- Verify tests are actually running (add console.log)
- Check for skipped tests

**E2E tests fail on CI:**
- Ensure Playwright browsers installed
- Check for hardcoded localhost URLs
- Verify auth state is being saved/restored

**Stress test data corruption:**
- Verify test cleanup runs even on failure (use afterAll)
- Check for race conditions in concurrent tests
- Verify RLS policies are active

---

## Appendix: Oracle Calculator

The oracle calculator is an independent implementation of the 90/180-day rule used to verify the application's calculations. It must:

1. Be completely separate from `lib/compliance/` code
2. Implement the same logic from first principles
3. Use date-fns for date handling (per CLAUDE.md)
4. Match the inclusive day counting (entry + exit both count)
5. Deduplicate overlapping trips using Set<dateString>

```typescript
// __tests__/utils/oracle-calculator.ts
import { parseISO, eachDayOfInterval, differenceInDays } from 'date-fns';

export function oracleCalculateDaysUsed(
  trips: { entry_date: string; exit_date: string; country: string }[],
  referenceDate: string,
  schengenCountries: Set<string>
): number {
  const schengenDays = new Set<string>();
  const refDate = parseISO(referenceDate);
  const windowStart = new Date(refDate);
  windowStart.setDate(windowStart.getDate() - 180);

  for (const trip of trips) {
    if (!schengenCountries.has(trip.country)) continue;

    const entry = parseISO(trip.entry_date);
    const exit = parseISO(trip.exit_date);

    const days = eachDayOfInterval({ start: entry, end: exit });
    for (const day of days) {
      if (day >= windowStart && day < refDate) {
        schengenDays.add(day.toISOString().split('T')[0]);
      }
    }
  }

  return schengenDays.size;
}
```

This oracle is used in every test to verify expected values independently.
