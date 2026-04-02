import { expect, test } from '@playwright/test';

test.describe('Authenticated navigation coverage', () => {
  test('core authenticated routes load for the seeded account', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /employee compliance/i })).toBeVisible();

    await page.goto('/import');
    await expect(page.getByRole('heading', { name: /import data/i })).toBeVisible();

    await page.goto('/trip-forecast');
    await expect(page.getByRole('heading', { name: /^trip forecast$/i })).toBeVisible();

    await page.goto('/future-job-alerts');
    await expect(page.getByRole('heading', { name: /^future job alerts$/i })).toBeVisible();

    await page.goto('/settings');
    await expect(
      page.getByRole('heading', { name: /control how your workspace runs/i })
    ).toBeVisible();

    await page.goto('/calendar');
    await expect(page.getByText(/calendar filters/i).first()).toBeVisible();
  });

  test('sidebar links navigate between primary product areas', async ({ page }) => {
    await page.goto('/dashboard');

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
