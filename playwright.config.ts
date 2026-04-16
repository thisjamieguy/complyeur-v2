import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join(__dirname, '.auth/user.json');
const e2eBaseUrl = 'http://localhost:3000';
const e2eReadyUrl = `${e2eBaseUrl}/login`;
const configuredWorkers = Number(process.env.PLAYWRIGHT_WORKERS ?? '1');

// Check if auth file exists - only use it if it does
const authFileExists = fs.existsSync(authFile);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Number.isFinite(configuredWorkers) && configuredWorkers > 0 ? configuredWorkers : 1,
  reporter: [
    ['html', { outputFolder: '.test-output/playwright-report' }],
    ['json', { outputFile: '.test-output/playwright-report/results.json' }],
  ],
  outputDir: '.test-output/test-results',
  // Global setup for authentication
  globalSetup: require.resolve('./e2e/auth.setup.ts'),
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Main test project - uses auth state if available
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use stored auth state if file exists
        ...(authFileExists ? { storageState: authFile } : {}),
      },
      testIgnore: /phase-regression\.spec\.ts/,
    },
    // No-auth project for regression tests that test public pages
    {
      name: 'chromium-no-auth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /phase-regression\.spec\.ts/,
    },
    // Stress test project with extended timeout
    {
      name: 'stress',
      use: {
        ...devices['Desktop Chrome'],
        ...(authFileExists ? { storageState: authFile } : {}),
      },
      testMatch: /stress-test\.spec\.ts/,
      timeout: 300000,
    },
  ],
  webServer: {
    command: 'pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3000',
    url: e2eReadyUrl,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      CRON_SECRET: process.env.CRON_SECRET ?? 'playwright-cron-secret',
      DISABLE_MFA_FOR_E2E: 'true',
      MFA_BYPASS_CONTEXT: 'playwright',
    },
  },
});
