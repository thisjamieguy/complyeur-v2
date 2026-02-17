import { test, expect } from '@playwright/test';

/**
 * PHASE REGRESSION TESTS
 * Run after completing each phase to ensure nothing broke.
 *
 * Usage: npm run test:regression
 */

// ============================================
// PHASE 1-2: Foundation & Auth
// ============================================
test.describe('Phase 1-2: Auth & Foundation', () => {

  test('public pages load without auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ComplyEur/i);

    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();

    await page.goto('/signup');
    await expect(page.locator('form')).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/landing|login/);

    await page.goto('/calendar');
    await expect(page).toHaveURL(/landing|login/);

    await page.goto('/settings');
    await expect(page).toHaveURL(/landing|login/);
  });

  test('login form has required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

// ============================================
// PHASE 3: Company Setup
// ============================================
test.describe('Phase 3: Company Setup', () => {

  test.skip('company settings page loads', async ({ page }) => {
    await page.goto('/settings/company');
    await expect(page.locator('h1')).toContainText(/company|settings/i);
  });
});

// ============================================
// PHASE 4: Employees
// ============================================
test.describe('Phase 4: Employees', () => {

  test.skip('employees list page loads', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('h1')).toContainText(/employee/i);
  });

  test.skip('add employee button exists', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('button, a').filter({ hasText: /add|new|create/i })).toBeVisible();
  });

  test.skip('employee form has required fields', async ({ page }) => {
    await page.goto('/employees/new');
    await expect(page.locator('input[name="first_name"], input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="last_name"], input[name="lastName"]')).toBeVisible();
  });
});

// ============================================
// PHASE 5: Trips
// ============================================
test.describe('Phase 5: Trips', () => {

  test.skip('trips list page loads', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.locator('h1')).toContainText(/trip/i);
  });

  test.skip('add trip requires employee selection', async ({ page }) => {
    await page.goto('/trips/new');
    await expect(page.locator('select, [role="combobox"]')).toBeVisible();
  });
});

// ============================================
// PHASE 7: Algorithm (Critical)
// ============================================
test.describe('Phase 7: Algorithm Display', () => {

  test.skip('dashboard shows compliance status', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="compliance-status"], .status-badge')).toBeVisible();
  });

  test.skip('days remaining displays correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=/\\d+ days?/i')).toBeVisible();
  });
});

// ============================================
// PHASE 8: Dashboard
// ============================================
test.describe('Phase 8: Dashboard', () => {

  test.skip('dashboard has employee compliance table', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('table, [role="table"]')).toBeVisible();
  });

  test.skip('status filters exist', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('button, select').filter({ hasText: /filter|status|all/i })).toBeVisible();
  });
});

// ============================================
// NAVIGATION: Cross-Phase Links
// ============================================
test.describe('Navigation Links Work', () => {

  test.skip('main nav links are functional', async ({ page }) => {
    await page.goto('/dashboard');

    await page.click('a[href="/employees"], nav >> text=Employees');
    await expect(page).toHaveURL(/employees/);

    await page.click('a[href="/dashboard"], nav >> text=Dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});

// ============================================
// DATA FLOW: End-to-End User Journeys
// ============================================
test.describe('Critical User Journeys', () => {

  test.skip('can create employee and see on dashboard', async ({ page }) => {
    await page.goto('/employees');
    await page.click('button:has-text("Add"), a:has-text("Add")');
    await page.fill('input[name="first_name"]', 'Test');
    await page.fill('input[name="last_name"]', 'Employee');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/employees/);
    await page.goto('/dashboard');
    await expect(page.locator('text=Test Employee')).toBeVisible();
  });
});
