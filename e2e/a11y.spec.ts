/**
 * Accessibility audit suite — axe-core + Playwright
 * Checks WCAG 2.1 AA compliance on all key routes.
 * Violations at "serious" or "critical" impact fail the build.
 * Run: pnpm test:e2e:a11y
 */

import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hasAuthenticatedStorageState(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((cookie) => /^sb-.+-auth-token$/.test(cookie.name));
}

async function runAxeAudit(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Best-effort network-idle wait — non-fatal if it times out (e.g. long-poll requests)
  await page.waitForLoadState('networkidle').catch(() => {});

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `[${v.impact}] ${v.id}: ${v.help} — ${v.helpUrl}`)
      .join('\n');
    expect
      .soft(results.violations, `Axe violations on ${url}:\n${summary}`)
      .toHaveLength(0);
  }
}

// ---------------------------------------------------------------------------
// Public pages (no auth)
// ---------------------------------------------------------------------------

test.describe('Public pages', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(30_000);

  const PUBLIC_ROUTES = [
    '/login',
    '/signup',
    '/landing',
    '/pricing',
    '/about',
    '/faq',
    '/contact',
    '/accessibility',
    '/privacy',
    '/terms',
  ] as const;

  for (const route of PUBLIC_ROUTES) {
    test(`a11y: ${route}`, async ({ page }) => {
      await runAxeAudit(page, route);
    });
  }
});

// ---------------------------------------------------------------------------
// Authenticated pages (skip gracefully when no auth state is present)
// ---------------------------------------------------------------------------

test.describe('Authenticated pages', () => {
  test.setTimeout(30_000);

  const AUTHENTICATED_ROUTES = [
    '/dashboard',
    '/calendar',
    '/import',
    '/exports',
    '/trip-forecast',
    '/settings',
    '/settings/team',
  ] as const;

  for (const route of AUTHENTICATED_ROUTES) {
    test(`a11y: ${route}`, async ({ page }) => {
      // Navigate first so cookies are populated from the stored storage state
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

      const isAuthenticated = await hasAuthenticatedStorageState(page);
      test.skip(!isAuthenticated, 'Skipping authenticated a11y test — no auth state available');

      await runAxeAudit(page, route);
    });
  }
});
