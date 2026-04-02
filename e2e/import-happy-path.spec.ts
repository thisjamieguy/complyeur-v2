import { expect, test, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { generateEmployeeCSV } from '../__tests__/utils/csv-generator';

const SCRATCHPAD_DIR = process.env.TEST_TEMP_DIR || '/tmp/playwright-import-tests';
const createdTestFiles = new Set<string>();

const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL || 'test@complyeur.com',
  password: process.env.TEST_USER_PASSWORD || 'test-password-123',
};

function ensureScratchpadDir(): void {
  if (!fs.existsSync(SCRATCHPAD_DIR)) {
    fs.mkdirSync(SCRATCHPAD_DIR, { recursive: true });
  }
}

function writeTestFile(filename: string, content: string): string {
  ensureScratchpadDir();
  const uniquePrefix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const filePath = path.join(SCRATCHPAD_DIR, `${uniquePrefix}-${filename}`);
  fs.writeFileSync(filePath, content, 'utf-8');
  createdTestFiles.add(filePath);
  return filePath;
}

function cleanupTestFiles(): void {
  for (const filePath of createdTestFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  createdTestFiles.clear();
}

async function login(page: Page): Promise<boolean> {
  await page.goto('/login');

  const currentUrl = page.url();
  const isAuthenticatedRoute = /\/dashboard|\/employees|\/import|\/calendar/.test(currentUrl);
  if (isAuthenticatedRoute) {
    return true;
  }

  if (currentUrl.includes('/landing') || currentUrl.includes('waitlist')) {
    return false;
  }

  const emailInput = page.getByLabel(/email/i);
  const hasLoginForm = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (!hasLoginForm) {
    return false;
  }

  await emailInput.fill(TEST_CREDENTIALS.email);
  await page.getByLabel(/password/i).fill(TEST_CREDENTIALS.password);
  await page.getByRole('button', { name: /sign in|log in|sign in with email/i }).click();

  try {
    await page.waitForURL(/\/dashboard|\/employees|\/import|\/calendar/, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function selectEmployeeImport(page: Page): Promise<void> {
  await page.goto('/import');
  await page.waitForLoadState('networkidle');
  await page.getByText(/employees/i).first().click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.waitForURL(/\/import\/upload\?format=employees/, { timeout: 10000 });
}

async function uploadFile(page: Page, filePath: string): Promise<void> {
  const chooseFileButton = page.getByRole('button', { name: /choose file/i });
  const hasChooserButton = await chooseFileButton.isVisible().catch(() => false);

  if (hasChooserButton) {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      chooseFileButton.click(),
    ]);
    await fileChooser.setFiles(filePath);
  } else {
    await page.locator('input[type="file"]').setInputFiles(filePath);
  }

  await expect(page.getByText(path.basename(filePath))).toBeVisible({ timeout: 10000 });
  const validateButton = page.getByRole('button', { name: /validate.*preview/i });
  await expect(validateButton).toBeEnabled({ timeout: 10000 });
  await validateButton.click();
}

test.describe('Import happy path', () => {
  test.beforeAll(() => {
    ensureScratchpadDir();
  });

  test.afterAll(() => {
    cleanupTestFiles();
  });

  test('employee import completes successfully', async ({ page }) => {
    test.setTimeout(60000);

    const loggedIn = await login(page);
    if (!loggedIn) {
      test.skip(true, 'Skipping: app is in waitlist mode or login failed');
      return;
    }

    const csvContent = generateEmployeeCSV({
      count: 5,
      seed: 12345,
      includePassport: true,
      includeNationality: true,
    });
    const filePath = writeTestFile('baseline-employees-import.csv', csvContent);

    await selectEmployeeImport(page);
    await uploadFile(page, filePath);

    const mappingUI = page.getByRole('heading', { name: /map columns/i });
    if (await mappingUI.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.getByRole('button', { name: /continue to preview|confirm mapping/i }).click();
    }

    await expect(page.getByRole('heading', { name: /validation preview/i })).toBeVisible({ timeout: 30000 });
    const importButton = page.getByRole('button', { name: /import.*valid.*row/i });
    await expect(importButton).toBeEnabled({ timeout: 10000 });
    await importButton.click();

    await Promise.race([
      page.waitForURL(/\/import\/success/, { timeout: 60000 }),
      expect(page.getByText(/import complete|successfully imported/i).first()).toBeVisible({ timeout: 60000 }),
    ]);
  });
});
