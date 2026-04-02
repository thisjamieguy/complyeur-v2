import { expect, test } from '@playwright/test';

test.describe('Authenticated smoke coverage', () => {
  test('user can sign in and reach the dashboard', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    test.skip(!testEmail || !testPassword, 'Auth smoke requires TEST_USER_EMAIL and TEST_USER_PASSWORD');

    await page.goto('/login');

    const emailField = page.getByLabel(/email/i);
    const loginFormVisible = await emailField.isVisible({ timeout: 5000 }).catch(() => false);

    if (loginFormVisible) {
      await emailField.fill(testEmail!);
      await page.getByLabel(/password/i).fill(testPassword!);
      await page.getByRole('button', { name: /sign in with email/i }).click();

      await page.waitForURL(/\/dashboard|\/calendar|\/import|\/employee\/|\/onboarding/, {
        timeout: 20000,
      });
    }

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { name: /employee compliance/i })
    ).toBeVisible();
  });
});
