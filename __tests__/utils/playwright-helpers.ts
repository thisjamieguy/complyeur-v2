/**
 * @fileoverview Playwright E2E test helpers
 *
 * Common page interactions and utilities for E2E tests.
 */

import { Page, expect, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Authentication Helpers
// ============================================================================

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Default test credentials - should match test user in Supabase
 */
export const DEFAULT_TEST_CREDENTIALS: TestCredentials = {
  email: process.env.TEST_USER_EMAIL || 'test@complyeur.com',
  password: process.env.TEST_USER_PASSWORD || 'test-password-123',
};

/**
 * Login to the application via UI.
 */
export async function login(
  page: Page,
  credentials: TestCredentials = DEFAULT_TEST_CREDENTIALS
): Promise<void> {
  await page.goto('/login');

  // Fill credentials
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);

  // Submit
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard|\/employees|\/import/, { timeout: 10000 });
}

/**
 * Save authenticated state for reuse across tests.
 */
export async function saveAuthState(
  page: Page,
  storageStatePath: string
): Promise<void> {
  await page.context().storageState({ path: storageStatePath });
}

/**
 * Create authenticated context from saved state.
 */
export async function createAuthenticatedContext(
  browser: { newContext: (options?: object) => Promise<BrowserContext> },
  storageStatePath: string
): Promise<BrowserContext> {
  return browser.newContext({ storageState: storageStatePath });
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to import page and wait for it to load.
 */
export async function goToImport(page: Page): Promise<void> {
  await page.goto('/import');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to dashboard and wait for data to load.
 */
export async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  // Wait for employee data to appear or empty state
  await Promise.race([
    page.getByRole('table').waitFor({ timeout: 10000 }),
    page.getByText(/no employees/i).waitFor({ timeout: 10000 }),
  ]).catch(() => {
    // Either table or empty state appeared
  });
}

/**
 * Navigate to employees list.
 */
export async function goToEmployees(page: Page): Promise<void> {
  await page.goto('/employees');
  await page.waitForLoadState('networkidle');
}

// ============================================================================
// File Upload Helpers
// ============================================================================

/**
 * Upload a file to an input element.
 */
export async function uploadFile(
  page: Page,
  fileContent: string,
  filename: string,
  mimeType: string = 'text/csv'
): Promise<string> {
  // Write to temp file
  const tempDir = process.env.TEST_TEMP_DIR || '/tmp';
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, fileContent);

  // Find file input and upload
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);

  return filePath;
}

/**
 * Upload a CSV file for import.
 */
export async function uploadCSVForImport(
  page: Page,
  csvContent: string,
  filename: string = 'test-import.csv'
): Promise<void> {
  await uploadFile(page, csvContent, filename, 'text/csv');

  // Wait for preview to appear
  await page.waitForSelector('[data-testid="import-preview"], table', { timeout: 10000 });
}

// ============================================================================
// Import Workflow Helpers
// ============================================================================

/**
 * Complete the import workflow after file upload.
 */
export async function completeImportWorkflow(
  page: Page,
  options: {
    confirmMappings?: boolean;
    duplicateStrategy?: 'skip' | 'update';
  } = {}
): Promise<void> {
  const { confirmMappings = true, duplicateStrategy = 'skip' } = options;

  // If mapping confirmation is needed
  if (confirmMappings) {
    const confirmMappingButton = page.getByRole('button', { name: /confirm mapping|next/i });
    if (await confirmMappingButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmMappingButton.click();
    }
  }

  // Select duplicate strategy if visible
  const duplicateSelect = page.getByRole('combobox', { name: /duplicate/i });
  if (await duplicateSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await duplicateSelect.selectOption(duplicateStrategy);
  }

  // Click final import button
  const importButton = page.getByRole('button', { name: /import|confirm/i });
  await importButton.click();

  // Wait for success message or redirect
  await Promise.race([
    page.waitForSelector('[data-testid="import-success"], [role="alert"]', { timeout: 30000 }),
    page.waitForURL(/\/employees|\/dashboard/, { timeout: 30000 }),
  ]);
}

// ============================================================================
// Dashboard Extraction Helpers
// ============================================================================

export interface EmployeeComplianceData {
  name: string;
  daysUsed: number;
  daysRemaining: number;
  status: string;
}

/**
 * Extract compliance data from dashboard table.
 */
export async function extractDashboardValues(
  page: Page
): Promise<EmployeeComplianceData[]> {
  const results: EmployeeComplianceData[] = [];

  // Get all table rows
  const rows = page.getByRole('row');
  const rowCount = await rows.count();

  // Skip header row
  for (let i = 1; i < rowCount; i++) {
    const row = rows.nth(i);

    // Extract values - adjust selectors based on actual DOM structure
    const nameCell = row.locator('[data-testid="employee-name"], td:first-child');
    const daysUsedCell = row.locator('[data-testid="days-used"]');
    const daysRemainingCell = row.locator('[data-testid="days-remaining"]');
    const statusCell = row.locator('[data-testid="status-badge"], [class*="badge"]');

    const name = await nameCell.textContent() || '';
    const daysUsedText = await daysUsedCell.textContent() || '0';
    const daysRemainingText = await daysRemainingCell.textContent() || '0';
    const status = await statusCell.textContent() || '';

    results.push({
      name: name.trim(),
      daysUsed: parseInt(daysUsedText.replace(/\D/g, ''), 10) || 0,
      daysRemaining: parseInt(daysRemainingText.replace(/[^\d-]/g, ''), 10) || 0,
      status: status.toLowerCase().trim(),
    });
  }

  return results;
}

/**
 * Compare extracted dashboard values with expected oracle values.
 */
export interface ComplianceDiscrepancy {
  employee: string;
  field: string;
  expected: string | number;
  actual: string | number;
}

export function compareWithOracle(
  actual: EmployeeComplianceData[],
  expected: Array<{
    name: string;
    expected: {
      daysUsed: number;
      daysRemaining: number;
      status: string;
    };
  }>
): ComplianceDiscrepancy[] {
  const discrepancies: ComplianceDiscrepancy[] = [];

  for (const exp of expected) {
    const actualEmployee = actual.find(
      (a) => a.name.toLowerCase().includes(exp.name.toLowerCase())
    );

    if (!actualEmployee) {
      discrepancies.push({
        employee: exp.name,
        field: 'presence',
        expected: 'found',
        actual: 'not found',
      });
      continue;
    }

    if (actualEmployee.daysUsed !== exp.expected.daysUsed) {
      discrepancies.push({
        employee: exp.name,
        field: 'daysUsed',
        expected: exp.expected.daysUsed,
        actual: actualEmployee.daysUsed,
      });
    }

    if (actualEmployee.daysRemaining !== exp.expected.daysRemaining) {
      discrepancies.push({
        employee: exp.name,
        field: 'daysRemaining',
        expected: exp.expected.daysRemaining,
        actual: actualEmployee.daysRemaining,
      });
    }

    const expectedStatus = exp.expected.status.toLowerCase();
    if (!actualEmployee.status.includes(expectedStatus)) {
      discrepancies.push({
        employee: exp.name,
        field: 'status',
        expected: expectedStatus,
        actual: actualEmployee.status,
      });
    }
  }

  return discrepancies;
}

// ============================================================================
// Discrepancy Report Generator
// ============================================================================

/**
 * Generate an HTML report of discrepancies.
 */
export async function generateDiscrepancyReport(
  discrepancies: ComplianceDiscrepancy[],
  outputPath: string = 'test-reports/discrepancy-report.html'
): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Compliance Discrepancy Report</title>
  <style>
    body { font-family: system-ui; padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; border: 1px solid #e5e7eb; text-align: left; }
    th { background: #f3f4f6; }
    .error { color: #dc2626; }
    .count { font-size: 1.25rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>Compliance Calculation Discrepancies</h1>
  <p class="count"><strong>${discrepancies.length}</strong> discrepancies found</p>
  <table>
    <thead>
      <tr>
        <th>Employee</th>
        <th>Field</th>
        <th>Expected</th>
        <th>Actual</th>
      </tr>
    </thead>
    <tbody>
      ${discrepancies.map(d => `
        <tr>
          <td>${d.employee}</td>
          <td>${d.field}</td>
          <td>${d.expected}</td>
          <td class="error">${d.actual}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <p style="margin-top: 2rem; color: #6b7280;">Generated: ${new Date().toISOString()}</p>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
}

// ============================================================================
// Performance Measurement
// ============================================================================

/**
 * Measure page load time.
 */
export async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return Date.now() - startTime;
}

/**
 * Measure time for an operation.
 */
export async function measureOperation<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;
  return { result, duration };
}
