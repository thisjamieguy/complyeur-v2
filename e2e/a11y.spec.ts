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

// Only "serious" and "critical" violations fail the build. "moderate" and
// "minor" findings (e.g. best-practice heading-order) are reported by axe but
// not treated as blocking — see the suite header.
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

interface AuditOptions {
  /** Run interactions (open a dialog, expand a row) before scanning. */
  setup?: (page: Page) => Promise<void>;
  /** Restrict the scan to a CSS selector (e.g. an open dialog). */
  include?: string;
}

async function runAxeAudit(page: Page, url: string, options: AuditOptions = {}): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Best-effort network-idle wait — non-fatal if it times out (e.g. long-poll requests)
  await page.waitForLoadState('networkidle').catch(() => {});

  if (options.setup) {
    await options.setup(page);
  }

  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
  ]);
  if (options.include) {
    builder = builder.include(options.include);
  }

  const results = await builder.analyze();
  const blocking = results.violations.filter((v) =>
    BLOCKING_IMPACTS.has(v.impact ?? '')
  );

  if (blocking.length > 0) {
    const summary = blocking
      .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node[s]) — ${v.helpUrl}`)
      .join('\n');
    expect
      .soft(blocking, `Serious/critical axe violations on ${url}:\n${summary}`)
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

  // Interactive state: axe on a static page cannot see modal content, which is
  // exactly where label/name/contrast issues hide. Open the Add Employee dialog
  // and expand a trip row so the country combobox + date pickers are scanned.
  test('a11y: dashboard → Add Employee dialog', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const isAuthenticated = await hasAuthenticatedStorageState(page);
    test.skip(!isAuthenticated, 'Skipping authenticated a11y test — no auth state available');

    await runAxeAudit(page, '/dashboard', {
      include: '[role="dialog"]',
      setup: async (p) => {
        await p.getByRole('button', { name: /add employee/i }).first().click();
        await p.getByRole('dialog').waitFor({ state: 'visible' });
        const addTrip = p.getByRole('button', { name: /add a trip|add another trip/i });
        if (await addTrip.isVisible().catch(() => false)) {
          await addTrip.click();
        }
      },
    });
  });
});
