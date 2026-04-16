import { expect, test, type Page } from '@playwright/test';

async function hasAuthenticatedDashboard(page: Page): Promise<boolean> {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  if (/\/(landing|login)/.test(page.url())) {
    return false;
  }

  return page
    .getByRole('heading', { name: /employee compliance/i })
    .isVisible({ timeout: 5000 })
    .catch(() => false);
}

test.describe('Authenticated navigation coverage', () => {
  test('core authenticated routes load for the seeded account', async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!(await hasAuthenticatedDashboard(page)), 'Skipping: authenticated E2E state is unavailable');

    await page.goto('/import', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /import data/i })).toBeVisible();

    await page.goto('/trip-forecast', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^trip forecast$/i })).toBeVisible();

    await page.goto('/future-job-alerts', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^future job alerts$/i })).toBeVisible();

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /control how your workspace runs/i })
    ).toBeVisible();

    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/calendar filters/i).first()).toBeVisible();
  });

  test('sidebar links navigate between primary product areas', async ({ page }) => {
    test.skip(!(await hasAuthenticatedDashboard(page)), 'Skipping: authenticated E2E state is unavailable');

    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('link', { name: /^import$/i }).click();
    await expect(page).toHaveURL(/\/import$/);
    await expect(page.getByRole('heading', { name: /import data/i })).toBeVisible();

    await page.getByRole('link', { name: /^future alerts$/i }).click();
    await expect(page).toHaveURL(/\/future-job-alerts$/);

    await page.getByRole('link', { name: /^trip forecast$/i }).click();
    await expect(page).toHaveURL(/\/trip-forecast$/);

    await page.getByRole('link', { name: /^settings$/i }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});
