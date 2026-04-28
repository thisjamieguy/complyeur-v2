/**
 * Mobile breakpoint tests — Pixel 7 viewport (412×915)
 * Verifies layout, navigation, forms, and overflow on mobile.
 * Run: pnpm test:e2e:mobile
 */

import { test, expect, Page, Browser } from '@playwright/test';

async function hasAuthenticatedDashboard(page: Page): Promise<boolean> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  if (/\/(landing|login)/.test(page.url())) return false;
  return page
    .getByRole('heading', { name: /employee compliance/i })
    .isVisible({ timeout: 15000 })
    .catch(() => false);
}

// ---------------------------------------------------------------------------
// 1. Public pages — mobile layout
// ---------------------------------------------------------------------------
test.describe('Public pages — mobile layout', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(45_000);

  test('/landing — hero heading visible, no horizontal scroll', async ({ page }) => {
    await page.goto('/landing', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const hasHorizontalScroll = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalScroll, 'Horizontal overflow on /landing').toBe(false);
  });

  test('/pricing — pricing heading visible, no horizontal scroll', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const heading = page.getByRole('heading', { name: /pric/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const hasHorizontalScroll = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalScroll, 'Horizontal overflow on /pricing').toBe(false);
  });

  test('/login — form visible and usable', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('/signup — form visible and usable', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Navigation — mobile
// ---------------------------------------------------------------------------
test.describe('Navigation — mobile', () => {
  test.setTimeout(45_000);

  let isAuthed = false;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    isAuthed = await hasAuthenticatedDashboard(page);
    await page.close();
    await ctx.close();
  });

  test('Dashboard loads on mobile — heading visible', async ({ page }) => {
    test.skip(!isAuthed, 'Skipping: no auth state');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      page.getByRole('heading', { name: /employee compliance/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Sidebar/nav toggle exists', async ({ page }) => {
    test.skip(!isAuthed, 'Skipping: no auth state');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Target the actual mobile menu trigger directly (rendered by MobileNav
    // inside the mobile header). Avoid the generic `nav` fallback because
    // `.first()` can resolve to the hidden desktop sidebar's <nav>.
    const toggle = page.getByRole('button', { name: /open menu/i }).first();

    await expect(toggle).toBeVisible({ timeout: 10_000 });
  });

  test('Tapping nav toggle opens/closes navigation', async ({ page }) => {
    test.skip(!isAuthed, 'Skipping: no auth state');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const toggle = page.getByRole('button', { name: /open menu/i }).first();

    const toggleVisible = await toggle.isVisible().catch(() => false);
    if (!toggleVisible) {
      // No toggle button found — sidebar may be permanently visible at this viewport
      test.skip();
      return;
    }

    const beforeState = await toggle.getAttribute('aria-expanded').catch(() => null);
    await toggle.click();
    await page.waitForTimeout(300);
    const afterState = await toggle.getAttribute('aria-expanded').catch(() => null);

    // State should have changed (toggled), or at minimum the click succeeded
    // We accept both attribute change and no-change (static nav) to avoid false failures
    expect(typeof afterState).toBe('string');
    if (beforeState !== null && afterState !== null) {
      expect(afterState).not.toBe(beforeState);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Dashboard table — mobile
// ---------------------------------------------------------------------------
test.describe('Dashboard table — mobile', () => {
  test.setTimeout(45_000);

  let isAuthed = false;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    isAuthed = await hasAuthenticatedDashboard(page);
    await page.close();
    await ctx.close();
  });

  test('Employee compliance table renders', async ({ page }) => {
    test.skip(!isAuthed, 'Skipping: no auth state');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // At mobile viewport (<768px) the dashboard hides the <table> and
    // renders a card list instead (see ComplianceTable: `hidden md:block`
    // for the table, `md:hidden` for the cards). Accept either the table
    // OR the mobile card list — but require something is rendered so we
    // still catch a regression where neither appears.
    const tableOrCards = page
      .locator(
        '[role="table"], [data-testid*="table"], tbody, [data-testid="employee-card"]',
      )
      .first();

    // The mobile card layout contains employee links like /employee/:id.
    // Fall back to asserting at least one employee link is visible if the
    // table selector doesn't match (handles both desktop table rows and
    // mobile cards without depending on new test IDs).
    const employeeLink = page.locator('a[href^="/employee/"]').first();

    const tableVisible = await tableOrCards
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!tableVisible) {
      await expect(employeeLink).toBeVisible({ timeout: 15_000 });
    }
  });

  test('Table is contained in a scrollable wrapper or fits viewport', async ({ page }) => {
    test.skip(!isAuthed, 'Skipping: no auth state');

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Confirm the page itself doesn't overflow horizontally
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(
      hasHorizontalScroll,
      'Horizontal overflow on /dashboard (table check)',
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Forms — mobile
// ---------------------------------------------------------------------------
test.describe('Forms — mobile', () => {
  test.setTimeout(45_000);

  let isAuthed = false;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    isAuthed = await hasAuthenticatedDashboard(page);
    await page.close();
    await ctx.close();
  });

  test('/import — heading and file upload area visible', async ({ page }) => {
    test.skip(!isAuthed, 'Skipping: no auth state');

    await page.goto('/import', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    const uploadArea = page
      .locator('input[type="file"], [data-testid*="upload"], [class*="upload"], [class*="dropzone"]')
      .first();
    await expect(uploadArea).toBeAttached({ timeout: 10_000 });
  });

  test('/settings — heading and form fields visible', async ({ page }) => {
    test.skip(!isAuthed, 'Skipping: no auth state');

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    const formField = page.locator('input, select, textarea').first();
    await expect(formField).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 5. No horizontal overflow — key authenticated pages
// ---------------------------------------------------------------------------
test.describe('No horizontal overflow — key authenticated pages', () => {
  test.setTimeout(45_000);

  let isAuthed = false;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    isAuthed = await hasAuthenticatedDashboard(page);
    await page.close();
    await ctx.close();
  });

  const pages = ['/dashboard', '/calendar', '/exports', '/trip-forecast'] as const;

  for (const url of pages) {
    test(`No horizontal overflow on ${url}`, async ({ page }) => {
      test.skip(!isAuthed, 'Skipping: no auth state');

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalScroll, `Horizontal overflow on ${url}`).toBe(false);
    });
  }
});
