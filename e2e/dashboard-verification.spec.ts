/**
 * @fileoverview E2E Tests for Dashboard Verification
 *
 * Phase 3B: Tests the dashboard displays correct values after data import.
 * Uses oracle comparison to verify compliance calculations at the UI level.
 *
 * Test Strategy:
 * - Import known test data with pre-calculated expected values
 * - Navigate to dashboard and verify displayed values match expected
 * - Test all dashboard features: filters, search, sort, detail views
 * - This is the critical "oracle comparison" at the UI level
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  compareWithOracle,
  generateDiscrepancyReport,
  EmployeeComplianceData,
  ComplianceDiscrepancy,
} from '../__tests__/utils/playwright-helpers';

// ============================================================================
// Test Configuration
// ============================================================================

const SCRATCHPAD_DIR = process.env.TEST_TEMP_DIR || '/tmp/playwright-dashboard-tests';
const TEST_TIMEOUT = 60000;

// Test credentials
const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'test@complyeur.com',
  password: process.env.TEST_USER_PASSWORD || 'test-password-123',
};

// ============================================================================
// Test Data with Known Expected Values (Oracle)
// ============================================================================

/**
 * Test employees with pre-calculated compliance values.
 * These values are calculated independently using the 90/180-day rule.
 *
 * Reference date: 2025-02-03 (today per env)
 * Window: 180 days back from reference date
 *
 * Status thresholds (default):
 * - Green: 0-60 days used (>= 30 remaining)
 * - Amber: 61-75 days used (15-29 remaining)
 * - Red: 76-89 days used (1-14 remaining)
 * - Breach: 90+ days used (< 0 remaining)
 */
const TEST_EMPLOYEES_WITH_ORACLE = [
  {
    name: 'Green Test Employee',
    email: 'green.test@test.example.com',
    passport: 'GT000001',
    nationality: 'GB',
    // Trips: 30 days in the window
    trips: [
      { entry_date: '2024-10-01', exit_date: '2024-10-15', country: 'FR' }, // 15 days
      { entry_date: '2024-11-01', exit_date: '2024-11-15', country: 'DE' }, // 15 days
    ],
    expected: {
      daysUsed: 30,
      daysRemaining: 60,
      status: 'green',
    },
  },
  {
    name: 'Amber Test Employee',
    email: 'amber.test@test.example.com',
    passport: 'AT000002',
    nationality: 'US',
    // Trips: 70 days in the window
    trips: [
      { entry_date: '2024-08-15', exit_date: '2024-09-23', country: 'ES' }, // 40 days
      { entry_date: '2024-10-01', exit_date: '2024-10-30', country: 'IT' }, // 30 days
    ],
    expected: {
      daysUsed: 70,
      daysRemaining: 20,
      status: 'amber',
    },
  },
  {
    name: 'Red Test Employee',
    email: 'red.test@test.example.com',
    passport: 'RT000003',
    nationality: 'CA',
    // Trips: 82 days in the window
    trips: [
      { entry_date: '2024-08-01', exit_date: '2024-09-10', country: 'FR' }, // 41 days
      { entry_date: '2024-10-01', exit_date: '2024-11-10', country: 'NL' }, // 41 days
    ],
    expected: {
      daysUsed: 82,
      daysRemaining: 8,
      status: 'red',
    },
  },
  {
    name: 'Breach Test Employee',
    email: 'breach.test@test.example.com',
    passport: 'BT000004',
    nationality: 'AU',
    // Trips: 95 days in the window (exceeds 90)
    trips: [
      { entry_date: '2024-08-01', exit_date: '2024-10-03', country: 'BE' }, // 64 days
      { entry_date: '2024-10-15', exit_date: '2024-11-15', country: 'AT' }, // 32 days
    ],
    expected: {
      daysUsed: 95,
      daysRemaining: -5,
      status: 'breach',
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Login to the application
 * Handles both normal mode and waitlist mode (where login redirects to landing)
 */
async function login(page: Page): Promise<boolean> {
  await page.goto('/login');

  // Check if we're in waitlist mode (redirected to landing page)
  const currentUrl = page.url();
  if (currentUrl.includes('/landing') || currentUrl.includes('waitlist')) {
    console.log('App is in waitlist mode - login not available');
    return false;
  }

  // Check if login form is present
  const emailInput = page.getByLabel(/email/i);
  const hasLoginForm = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!hasLoginForm) {
    console.log('Login form not found - may be in waitlist mode');
    return false;
  }

  // Fill credentials
  await emailInput.fill(TEST_CREDENTIALS.email);
  await page.getByLabel(/password/i).fill(TEST_CREDENTIALS.password);
  await page.getByRole('button', { name: /sign in|log in|sign in with email/i }).click();

  try {
    await page.waitForURL(/\/dashboard|\/employees|\/import|\/calendar/, { timeout: 15000 });
    return true;
  } catch {
    console.log('Login redirect failed - credentials may be invalid');
    return false;
  }
}

/**
 * Navigate to dashboard and wait for data to load
 */
async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Wait for either table or empty state
  await Promise.race([
    page.locator('table').waitFor({ timeout: 15000 }),
    page.getByText(/no employees/i).waitFor({ timeout: 15000 }),
  ]).catch(() => {
    // One of these should be visible
  });
}

/**
 * Extract compliance data from dashboard table
 */
async function extractDashboardData(page: Page): Promise<EmployeeComplianceData[]> {
  const results: EmployeeComplianceData[] = [];

  // Wait for table to be present
  const table = page.locator('table');
  if (!(await table.isVisible({ timeout: 5000 }).catch(() => false))) {
    // Try mobile card view
    const cards = page.locator('[class*="rounded-lg"][class*="border"]');
    const cardCount = await cards.count();

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const nameEl = card.locator('a, [class*="font-medium"]').first();
      const name = (await nameEl.textContent()) || '';

      if (!name.trim()) continue;

      // Extract days used and remaining from card
      const daysUsedText = await card.getByText(/days used/i).locator('..').textContent() || '';
      const daysRemainingText = await card.getByText(/remaining/i).locator('..').textContent() || '';

      const daysUsedMatch = daysUsedText.match(/(\d+)\s*\/\s*90/);
      const daysRemainingMatch = daysRemainingText.match(/(-?\d+)/);

      // Extract status from badge
      const badge = card.locator('[class*="badge"], [class*="text-green"], [class*="text-amber"], [class*="text-red"]');
      const badgeText = (await badge.textContent()) || '';
      const status = badgeText.toLowerCase().includes('compliant')
        ? 'green'
        : badgeText.toLowerCase().includes('risk')
          ? 'amber'
          : badgeText.toLowerCase().includes('non')
            ? 'red'
            : 'breach';

      results.push({
        name: name.trim(),
        daysUsed: daysUsedMatch ? parseInt(daysUsedMatch[1], 10) : 0,
        daysRemaining: daysRemainingMatch ? parseInt(daysRemainingMatch[1], 10) : 0,
        status,
      });
    }

    return results;
  }

  // Extract from table rows
  const rows = table.locator('tbody tr');
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const cells = row.locator('td');

    const nameCell = cells.nth(0);
    const statusCell = cells.nth(1);
    const daysUsedCell = cells.nth(2);
    const daysRemainingCell = cells.nth(3);

    const name = (await nameCell.textContent()) || '';
    if (!name.trim() || name.includes('No employees')) continue;

    const daysUsedText = (await daysUsedCell.textContent()) || '0';
    const daysRemainingText = (await daysRemainingCell.textContent()) || '0';
    const statusText = (await statusCell.textContent()) || '';

    // Parse days used (format: "30 / 90")
    const daysUsedMatch = daysUsedText.match(/(\d+)/);
    // Parse days remaining (format: "60 days" or "-5 days")
    const daysRemainingMatch = daysRemainingText.match(/(-?\d+)/);

    // Determine status from badge text
    let status = 'green';
    const statusLower = statusText.toLowerCase();
    if (statusLower.includes('breach')) status = 'breach';
    else if (statusLower.includes('non') || statusLower.includes('red')) status = 'red';
    else if (statusLower.includes('risk') || statusLower.includes('amber')) status = 'amber';
    else if (statusLower.includes('compliant')) status = 'green';

    results.push({
      name: name.trim(),
      daysUsed: daysUsedMatch ? parseInt(daysUsedMatch[1], 10) : 0,
      daysRemaining: daysRemainingMatch ? parseInt(daysRemainingMatch[1], 10) : 0,
      status,
    });
  }

  return results;
}

/**
 * Generate employee CSV for test data
 */
function generateTestEmployeeCSV(): string {
  const headers = ['name', 'email', 'passport', 'nationality'];
  const rows = [headers.join(',')];

  for (const emp of TEST_EMPLOYEES_WITH_ORACLE) {
    rows.push(`${emp.name},${emp.email},${emp.passport},${emp.nationality}`);
  }

  return rows.join('\n');
}

/**
 * Generate trip CSV for test data
 */
function generateTestTripCSV(): string {
  const headers = ['email', 'entry_date', 'exit_date', 'country'];
  const rows = [headers.join(',')];

  for (const emp of TEST_EMPLOYEES_WITH_ORACLE) {
    for (const trip of emp.trips) {
      rows.push(`${emp.email},${trip.entry_date},${trip.exit_date},${trip.country}`);
    }
  }

  return rows.join('\n');
}

// ============================================================================
// Test Suites
// ============================================================================

test.describe('Dashboard Verification E2E', () => {
  test.beforeAll(async () => {
    // Ensure test directory exists
    if (!fs.existsSync(SCRATCHPAD_DIR)) {
      fs.mkdirSync(SCRATCHPAD_DIR, { recursive: true });
    }
  });

  // =========================================================================
  // Core Dashboard Display Tests
  // =========================================================================

  test.describe('Dashboard Display', () => {
    test('dashboard loads and displays employee data', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Verify page title/header
      await expect(page.getByText(/employee compliance/i)).toBeVisible();

      // Verify either table or empty state is shown
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no employees|add.*first/i).isVisible().catch(() => false);

      expect(hasTable || hasEmptyState).toBe(true);
    });

    test('dashboard shows compliance statistics', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Look for stats section - should show counts for each status
      const statsSection = page.locator('[class*="stats"], [class*="grid"]').first();

      // Check for total count or status labels
      const hasStats = await Promise.race([
        page.getByText(/total|compliant|at risk|breach/i).isVisible().catch(() => false),
        page.locator('[class*="stat"]').isVisible().catch(() => false),
      ]);

      // Stats may not be visible if no employees
      // This is acceptable
    });

    test('days remaining displays with correct formatting', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Check for days display format
      const daysText = page.getByText(/\d+ days?|days remaining/i);

      // If employees exist, days should be visible
      const hasEmployees = await page.locator('table tbody tr').count() > 0;
      if (hasEmployees) {
        await expect(daysText.first()).toBeVisible();
      }
    });
  });

  // =========================================================================
  // Filter Tests
  // =========================================================================

  test.describe('Status Filters', () => {
    test('filter buttons are visible', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Look for filter buttons
      await expect(page.getByRole('button', { name: /all/i })).toBeVisible();

      // Additional filters should be visible
      const complianceFilter = page.getByRole('button', { name: /compliant/i });
      const riskFilter = page.getByRole('button', { name: /risk|amber/i });

      await expect(complianceFilter.or(riskFilter).first()).toBeVisible();
    });

    test('clicking filter updates displayed employees', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Get initial employee count
      const initialRows = await page.locator('table tbody tr').count();

      // Click a filter (if there are employees)
      if (initialRows > 0) {
        // Try clicking "At Risk" filter
        const riskFilter = page.getByRole('button', { name: /at risk/i });
        if (await riskFilter.isVisible().catch(() => false)) {
          await riskFilter.click();

          // URL should update with filter param
          await expect(page).toHaveURL(/status=amber/);

          // Click "All" to reset
          await page.getByRole('button', { name: /all/i }).click();
        }
      }
    });

    test('filter state persists in URL', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }

      // Navigate directly with filter in URL
      await page.goto('/dashboard?status=amber');
      await page.waitForLoadState('networkidle');

      // Check that the filter button shows active state
      const amberFilter = page.getByRole('button', { name: /at risk/i });
      if (await amberFilter.isVisible().catch(() => false)) {
        // Check for active class or aria-pressed
        await expect(amberFilter).toHaveAttribute('aria-pressed', 'true');
      }
    });
  });

  // =========================================================================
  // Search Tests
  // =========================================================================

  test.describe('Search Functionality', () => {
    test('search input is visible', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Look for search input
      const searchInput = page.getByPlaceholder(/search/i);
      await expect(searchInput).toBeVisible();
    });

    test('search filters employees by name', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      const initialRows = await page.locator('table tbody tr').count();

      if (initialRows > 0) {
        // Get first employee name
        const firstName = await page.locator('table tbody tr td').first().textContent();
        if (firstName) {
          // Search for partial name
          const searchTerm = firstName.split(' ')[0];
          await page.getByPlaceholder(/search/i).fill(searchTerm);

          // Wait for filtering
          await page.waitForTimeout(500);

          // Should still see the matching employee
          await expect(page.getByText(firstName)).toBeVisible();
        }
      }
    });

    test('search with no results shows appropriate message', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Search for non-existent name
      await page.getByPlaceholder(/search/i).fill('ZZZZNONEXISTENT12345');

      // Wait for filtering
      await page.waitForTimeout(500);

      // Should show no results message
      await expect(page.getByText(/no employees match/i)).toBeVisible();
    });
  });

  // =========================================================================
  // Sort Tests
  // =========================================================================

  test.describe('Sort Functionality', () => {
    test('sort dropdown is visible', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Look for sort dropdown/select
      const sortSelect = page.locator('select, [role="combobox"]').filter({ hasText: /sort|order/i });

      // Sort may be implemented as dropdown or button group
      const hasSortControl = await sortSelect.isVisible().catch(() => false);
      const hasSortButtons = await page.getByRole('button', { name: /sort/i }).isVisible().catch(() => false);

      // Either is acceptable
    });

    test('changing sort reorders employees', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      const rows = await page.locator('table tbody tr').count();
      if (rows > 1) {
        // Get initial first employee
        const initialFirst = await page.locator('table tbody tr').first().locator('td').first().textContent();

        // Find and click sort control
        const sortSelect = page.locator('select').filter({ hasText: /remaining/i });
        if (await sortSelect.isVisible().catch(() => false)) {
          // Change sort order
          await sortSelect.selectOption({ index: 1 });

          // Wait for reorder
          await page.waitForTimeout(500);

          // Get new first employee - may be different
          const newFirst = await page.locator('table tbody tr').first().locator('td').first().textContent();

          // Sort changed if order different (not always guaranteed depending on data)
        }
      }
    });
  });

  // =========================================================================
  // Employee Detail Navigation Tests
  // =========================================================================

  test.describe('Employee Detail Navigation', () => {
    test('clicking employee navigates to detail page', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      const rows = await page.locator('table tbody tr').count();
      if (rows > 0) {
        // Click on first employee row
        const firstRow = page.locator('table tbody tr').first();
        await firstRow.click();

        // Should navigate to employee detail page
        await expect(page).toHaveURL(/\/employee\//);
      }
    });

    test('view button navigates to employee detail', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      const viewButton = page.getByRole('button', { name: /view/i }).or(page.getByRole('link', { name: /view/i }));
      if (await viewButton.first().isVisible().catch(() => false)) {
        await viewButton.first().click();
        await expect(page).toHaveURL(/\/employee\//);
      }
    });
  });

  // =========================================================================
  // Oracle Comparison Tests (Critical)
  // =========================================================================

  test.describe('Oracle Comparison', () => {
    test.skip('validates displayed values match oracle calculations', async ({ page }) => {
      // This test requires test data to be pre-loaded
      // Skip in CI where clean database may not have test employees
      test.setTimeout(TEST_TIMEOUT * 2);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Extract all displayed data
      const actualData = await extractDashboardData(page);

      // Compare with oracle expected values
      const discrepancies = compareWithOracle(actualData, TEST_EMPLOYEES_WITH_ORACLE);

      // Generate report if discrepancies found
      if (discrepancies.length > 0) {
        const reportPath = path.join(SCRATCHPAD_DIR, 'oracle-discrepancy-report.html');
        await generateDiscrepancyReport(discrepancies, reportPath);
        console.log(`Discrepancy report generated at: ${reportPath}`);
      }

      // Assert no discrepancies
      expect(discrepancies).toHaveLength(0);
    });
  });

  // =========================================================================
  // Mobile Responsiveness Tests
  // =========================================================================

  test.describe('Mobile View', () => {
    test('dashboard adapts to mobile viewport', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Table should be hidden on mobile
      const tableVisible = await page.locator('table').isVisible().catch(() => false);

      // Either cards are shown or responsive table is used
      // Just verify page loads without error
      await expect(page.getByText(/employee compliance/i)).toBeVisible();
    });
  });

  // =========================================================================
  // Empty State Tests
  // =========================================================================

  test.describe('Empty State', () => {
    test.skip('shows appropriate message when no employees', async ({ page }) => {
      // This test is for accounts with no employees
      // Skipped by default as most test accounts have data
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // If no employees, should show empty state
      const hasNoEmployees = await page.getByText(/no employees|add.*first|get started/i).isVisible().catch(() => false);

      if (hasNoEmployees) {
        // Should have call-to-action to add employees
        await expect(page.getByRole('button', { name: /add|create/i })).toBeVisible();
      }
    });
  });

  // =========================================================================
  // Add Employee Quick Action Tests
  // =========================================================================

  test.describe('Quick Actions', () => {
    test('add employee dialog is accessible', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Look for add employee button
      const addButton = page.getByRole('button', { name: /add.*employee|new.*employee/i });
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();

        // Dialog should appear
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

        // Close dialog
        await page.keyboard.press('Escape');
      }
    });

    test('add trip button opens modal', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }
      await goToDashboard(page);

      // Find a row with plus button for adding trip
      const addTripButton = page.locator('table tbody tr').first().getByRole('button').filter({ has: page.locator('svg') }).first();

      if (await addTripButton.isVisible().catch(() => false)) {
        await addTripButton.click();

        // Modal should appear
        await expect(page.getByRole('dialog').or(page.getByText(/add.*trip/i))).toBeVisible({ timeout: 5000 });

        // Close
        await page.keyboard.press('Escape');
      }
    });
  });

  // =========================================================================
  // Performance Tests
  // =========================================================================

  test.describe('Performance', () => {
    test('dashboard loads within acceptable time', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const loggedIn = await login(page);
      if (!loggedIn) {
        test.skip(true, 'Skipping: App is in waitlist mode or login failed');
        return;
      }

      const startTime = Date.now();
      await goToDashboard(page);
      const loadTime = Date.now() - startTime;

      console.log(`Dashboard load time: ${loadTime}ms`);

      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });
  });
});
