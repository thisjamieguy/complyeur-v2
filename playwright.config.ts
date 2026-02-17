import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join(__dirname, '.auth/user.json');

// Check if auth file exists - only use it if it does
const authFileExists = fs.existsSync(authFile);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '.test-output/playwright-report' }],
    ['json', { outputFile: '.test-output/playwright-report/results.json' }],
  ],
  outputDir: '.test-output/test-results',
  // Global setup for authentication
  globalSetup: require.resolve('./e2e/auth.setup.ts'),
  use: {
    baseURL: 'http://localhost:3000',
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
    command: 'pnpm next dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      CRON_SECRET: process.env.CRON_SECRET ?? 'playwright-cron-secret',
    },
  },
});
