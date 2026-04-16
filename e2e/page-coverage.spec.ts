import { expect, test, type Page } from '@playwright/test';

const publicDirectPages = [
  { path: '/landing', heading: /manage international travel compliance without the spreadsheet drag/i },
  { path: '/pricing', heading: /simple pricing for schengen compliance/i },
  { path: '/about', heading: /about complyeur/i },
  { path: '/faq', heading: /frequently asked questions|faq/i },
  { path: '/contact', heading: /^contact us$/i },
  { path: '/blog', heading: /schengen compliance articles for office teams/i },
  { path: '/privacy', heading: /privacy policy/i },
  { path: '/terms', heading: /terms of service/i },
  { path: '/cookies', heading: /cookie policy/i },
  { path: '/accessibility', heading: /accessibility statement/i },
  { path: '/landing/preview', heading: /see how complyeur flags travel compliance risk step by step/i },
  { path: '/login', heading: /welcome back/i },
  { path: '/signup', heading: /create your account/i },
  { path: '/forgot-password', text: /reset your password/i },
  { path: '/reset-password', text: /set new password/i },
  { path: '/check-email', heading: /check your email/i },
] as const;

const authenticatedDirectPages = [
  { path: '/dashboard', heading: /employee compliance/i },
  { path: '/calendar', text: /calendar filters/i },
  { path: '/import', heading: /import data/i },
  { path: '/import/upload?format=employees', text: /upload|drag.*drop|choose file/i },
  { path: '/exports', heading: /export compliance data/i },
  { path: '/trip-forecast', heading: /^trip forecast$/i },
  { path: '/future-job-alerts', heading: /^future job alerts$/i },
  { path: '/settings', heading: /control how your workspace runs/i },
  { path: '/settings/import-history', heading: /import history/i },
  { path: '/settings/mappings', heading: /column mappings/i },
  { path: '/settings/team', heading: /^team$/i },
  { path: '/mfa', heading: /multi-factor authentication/i },
] as const;

const restrictedPagesForStandardUser = [
  '/admin',
  '/admin/activity',
  '/admin/companies',
  '/admin/feedback',
  '/admin/metrics',
  '/admin/settings',
  '/admin/tiers',
  '/gdpr',
] as const;

async function hasAuthenticatedDashboard(page: Page): Promise<boolean> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  if (/\/(landing|login)/.test(page.url())) {
    return false;
  }

  return page
    .getByRole('heading', { name: /employee compliance/i })
    .isVisible({ timeout: 15000 })
    .catch(async () => {
      const response = await page.context().request.get('/dashboard', { maxRedirects: 0 });
      return response.ok();
    });
}

async function hasAuthenticatedStorageState(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((cookie) => /^sb-.+-auth-token$/.test(cookie.name));
}

async function gotoRestrictedRoute(page: Page, path: string): Promise<void> {
  const response = await page.context().request.get(path, { maxRedirects: 0 });

  expect([302, 303, 307, 308]).toContain(response.status());
  expect(response.headers().location).toMatch(/\/(dashboard|login)(?:[/?#]|$)/);
}

test.describe('Route coverage matrix', () => {
  test.describe('Direct public pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const route of publicDirectPages) {
      test(`${route.path} renders`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });

        await expect(page).toHaveURL(new RegExp(route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

        if ('heading' in route) {
          await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
        } else {
          await expect(page.getByText(route.text).first()).toBeVisible();
        }
      });
    }

    test('root redirects to landing', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/landing$/);
      await expect(
        page.getByRole('heading', { name: /manage international travel compliance without the spreadsheet drag/i })
      ).toBeVisible();
    });

    test('/landing/sandbox redirects to the supported preview page', async ({ page }) => {
      await page.goto('/landing/sandbox', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/landing\/preview$/);
      await expect(
        page.getByRole('heading', { name: /see how complyeur flags travel compliance risk step by step/i })
      ).toBeVisible();
    });
  });

  test.describe('Direct authenticated pages', () => {
    for (const route of authenticatedDirectPages) {
      test(`${route.path} renders`, async ({ page }) => {
        test.setTimeout(60_000);
        test.skip(!(await hasAuthenticatedDashboard(page)), 'Skipping: authenticated E2E state is unavailable');
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });

        await expect(page).toHaveURL(new RegExp(route.path.split('?')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

        if ('heading' in route) {
          await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({
            timeout: 15000,
          });
        } else {
          await expect(page.getByText(route.text).first()).toBeVisible({
            timeout: 15000,
          });
        }
      });
    }

    test('employee detail page is reachable from the dashboard table', async ({ page }) => {
      test.skip(!(await hasAuthenticatedDashboard(page)), 'Skipping: authenticated E2E state is unavailable');

      const firstEmployeeLink = page.locator('tbody tr a[href^="/employee/"]').first();
      await expect(firstEmployeeLink).toBeVisible();

      const href = await firstEmployeeLink.getAttribute('href');
      expect(href).toMatch(/^\/employee\//);

      await page.goto(href!, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/employee\/.+/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });

  test.describe('Dynamic public pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('blog article pages are reachable from the blog index', async ({ page }) => {
      await page.goto('/blog', { waitUntil: 'domcontentloaded' });
      const firstArticleLink = page.getByRole('link', { name: /read article/i }).first();
      await expect(firstArticleLink).toBeVisible();

      const href = await firstArticleLink.getAttribute('href');
      expect(href).toMatch(/^\/blog\//);

      await page.goto(href!, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/blog\/.+/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });

  test.describe('State-driven public routing', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('/unsubscribe without a token shows the invalid-link state', async ({ page }) => {
      await page.goto('/unsubscribe', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/unsubscribe$/);
      await expect(page.getByRole('heading', { name: /invalid unsubscribe link/i })).toBeVisible();
    });
  });

  test.describe('Restricted routes for the standard E2E account', () => {
    for (const path of restrictedPagesForStandardUser) {
      test(`${path} is not directly accessible`, async ({ page }) => {
        test.setTimeout(60_000);
        test.skip(!(await hasAuthenticatedStorageState(page)), 'Skipping: authenticated E2E state is unavailable');
        await gotoRestrictedRoute(page, path);
      });
    }
  });
});
