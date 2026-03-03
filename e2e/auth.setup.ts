/**
 * @fileoverview Playwright Global Setup for Authentication
 *
 * This setup creates an authenticated browser state by:
 * 1. Loading local env values (if available)
 * 2. Signing in through the real /login UI
 * 3. Saving storage state to a file for reuse by tests
 *
 * To use: Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
 * The storage state will be saved to .auth/user.json
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loadLocalEnv } from './utils/env';
import {
  createAdminClientFromEnv,
  ensureTestUser,
  getAdminConfigStatus,
} from './utils/supabase-admin';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

async function markOnboardingComplete(userId: string): Promise<boolean> {
  const adminStatus = getAdminConfigStatus();
  if (adminStatus.ok === false) {
    console.log(`⚠️  Skipping test-user provisioning: ${adminStatus.reason}`);
    return false;
  }

  const adminClient = createAdminClientFromEnv();
  const { error } = await adminClient
    .from('profiles')
    .update({
      onboarding_completed_at: new Date().toISOString(),
      dashboard_tour_completed_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.log(`⚠️  Failed to mark Playwright test user onboarding complete: ${error.message}`);
    return false;
  }

  return true;
}

async function globalSetup(config: FullConfig) {
  loadLocalEnv();

  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  const configuredBaseUrl = config.projects[0]?.use?.baseURL;
  const baseURL = typeof configuredBaseUrl === 'string' ? configuredBaseUrl : 'http://localhost:3000';

  // Skip setup if no credentials
  if (!testEmail || !testPassword) {
    console.log('⚠️  TEST_USER_EMAIL and TEST_USER_PASSWORD not set - auth setup skipped');
    console.log('   Tests requiring authentication will be skipped');
    return;
  }

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('🔐 Setting up authenticated session...');

  try {
    const provisionedUser = await ensureTestUser({
      email: testEmail,
      password: testPassword,
      companyName: process.env.TEST_USER_COMPANY || 'Playwright Test Company',
    });

    if (!provisionedUser.ok || !provisionedUser.userId) {
      console.log(`⚠️  Playwright auth user provisioning unavailable: ${provisionedUser.reason ?? 'unknown error'}`);
      console.log('   Tests requiring authentication will be skipped');
      return;
    }

    await markOnboardingComplete(provisionedUser.userId);

    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL,
    });
    const page = await context.newPage();

    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });

    const currentUrl = page.url();
    if (currentUrl.includes('/landing') || currentUrl.includes('waitlist')) {
      console.log('⚠️  App is in waitlist mode - auth setup skipped');
      await browser.close();
      return;
    }

    const emailInput = page.getByLabel(/email/i);
    const hasLoginForm = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasLoginForm) {
      console.log('⚠️  Login form not found during auth setup - skipping');
      await browser.close();
      return;
    }

    await emailInput.fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in|log in|sign in with email/i }).click();

    try {
      await page.waitForURL(/\/dashboard|\/employees|\/employee\/|\/import|\/calendar|\/onboarding/, { timeout: 15000 });
    } catch {
      console.log('❌ Login redirect failed during auth setup');
      await browser.close();
      return;
    }

    // Check if we're authenticated (should be on dashboard, not redirected)
    const finalUrl = page.url();
    if (finalUrl.includes('/landing') || finalUrl.includes('/login')) {
      console.log('❌ Auth setup did not reach an authenticated route');
      await browser.close();
      return;
    }

    console.log(`✅ Authenticated as: ${testEmail}`);
    console.log('✅ Authentication verified - saving state');

    // Save the storage state
    await context.storageState({ path: AUTH_FILE });

    await browser.close();

    console.log(`✅ Auth state saved to: ${AUTH_FILE}`);
  } catch (error) {
    console.log(`❌ Auth setup error: ${error}`);
    console.log('   Tests requiring authentication will be skipped');
  }
}

export default globalSetup;
