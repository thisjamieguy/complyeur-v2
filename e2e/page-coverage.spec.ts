import { expect, test } from '@playwright/test';

const publicDirectPages = [
  { path: '/landing', heading: /approve eu travel with complete certainty/i },
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
  { path: '/landing-sandbox', heading: /manage international travel compliance without the spreadsheet drag/i },
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
  { path: '/gdpr', heading: /gdpr & privacy tools/i },
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
] as const;

test.describe('Route coverage matrix', () => {
  test.describe('Direct public pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const route of publicDirectPages) {
      test(`${route.path} renders`, async ({ page }) => {
        await page.goto(route.path);

        await expect(page).toHaveURL(new RegExp(route.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

        if ('heading' in route) {
          await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
        } else {
          await expect(page.getByText(route.text).first()).toBeVisible();
        }
      });
    }

    test('root redirects to landing', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/landing$/);
      await expect(page.getByRole('heading', { name: /approve eu travel with complete certainty/i })).toBeVisible();
    });

    test('/landing/sandbox redirects to the supported preview page', async ({ page }) => {
      await page.goto('/landing/sandbox');
      await expect(page).toHaveURL(/\/landing\/preview$/);
      await expect(
        page.getByRole('heading', { name: /see how complyeur flags travel compliance risk step by step/i })
      ).toBeVisible();
    });
  });

  test.describe('Direct authenticated pages', () => {
    for (const route of authenticatedDirectPages) {
      test(`${route.path} renders`, async ({ page }) => {
        await page.goto(route.path);

        await expect(page).toHaveURL(new RegExp(route.path.split('?')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

        if ('heading' in route) {
          await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
        } else {
          await expect(page.getByText(route.text).first()).toBeVisible();
        }
      });
    }

    test('employee detail page is reachable from the dashboard table', async ({ page }) => {
      await page.goto('/dashboard');
      const firstEmployeeLink = page.locator('tbody tr a').first();
      await expect(firstEmployeeLink).toBeVisible();

      const href = await firstEmployeeLink.getAttribute('href');
      expect(href).toMatch(/^\/employee\//);

      await firstEmployeeLink.click();
      await expect(page).toHaveURL(/\/employee\/.+/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });

  test.describe('Dynamic public pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('blog article pages are reachable from the blog index', async ({ page }) => {
      await page.goto('/blog');
      const firstArticleLink = page.getByRole('link', { name: /read article/i }).first();
      await expect(firstArticleLink).toBeVisible();

      const href = await firstArticleLink.getAttribute('href');
      expect(href).toMatch(/^\/blog\//);

      await firstArticleLink.click();
      await expect(page).toHaveURL(/\/blog\/.+/);
      await expect(page.getByRole('heading').first()).toBeVisible();
    });
  });

  test.describe('State-driven public routing', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('/unsubscribe without a token currently lands on the public landing page', async ({ page }) => {
      await page.goto('/unsubscribe');
      await expect(page).toHaveURL(/\/landing$/);
      await expect(
        page.getByRole('heading', { name: /approve eu travel with complete certainty/i })
      ).toBeVisible();
    });
  });

  test.describe('Restricted routes for the standard E2E account', () => {
    for (const path of restrictedPagesForStandardUser) {
      test(`${path} is not directly accessible`, async ({ page }) => {
        await page.goto(path);
        await expect(page.url()).not.toContain(path);
        await expect(page).toHaveURL(/\/dashboard|\/login/);
      });
    }
  });
});
