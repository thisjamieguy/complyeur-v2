import { expect, test } from '@playwright/test';

test.use({
  // Force a logged-out context so public-route assertions are deterministic
  // even when local auth state exists for other E2E suites.
  storageState: { cookies: [], origins: [] },
});

test.describe('Public smoke coverage', () => {
  test('root redirects to landing and shows primary marketing CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/landing$/);
    await expect(
      page.getByRole('heading', { name: /approve eu travel with complete certainty/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /request early access/i }).first()
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('core public pages load with their primary headings', async ({ page }) => {
    await page.goto('/pricing');
    await expect(
      page.getByRole('heading', { name: /simple pricing for schengen compliance/i })
    ).toBeVisible();

    await page.goto('/blog');
    await expect(
      page.getByRole('heading', { name: /schengen compliance articles for office teams/i })
    ).toBeVisible();

    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /^contact us$/i })).toBeVisible();
  });

  test('login page exposes the expected auth entry points', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign in with email/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot your password/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^sign up$/i })).toBeVisible();
  });

  test('signup form blocks mismatched passwords', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel(/^name$/i).fill('E2E Tester');
    await page.getByLabel(/^email$/i).fill('e2e-signup-check@example.com');
    await page.getByLabel(/^company$/i).fill('ComplyEur Test Company');
    await page.getByLabel(/^password$/i).fill('ValidPass1');
    await page.getByLabel(/confirm password/i).fill('DifferentPass1');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('protected routes redirect logged-out users away from app areas', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/calendar', '/settings', '/import'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/(landing|login)/);
    }
  });
});
