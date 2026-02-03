/**
 * @fileoverview Playwright Global Setup for Authentication
 *
 * This setup creates an authenticated browser state by:
 * 1. Signing in via Supabase Auth API directly
 * 2. Setting the auth cookies in a browser context
 * 3. Saving the state to a file for reuse by tests
 *
 * To use: Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
 * The storage state will be saved to .auth/user.json
 */

import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  // Skip setup if no credentials
  if (!testEmail || !testPassword) {
    console.log('⚠️  TEST_USER_EMAIL and TEST_USER_PASSWORD not set - auth setup skipped');
    console.log('   Tests requiring authentication will be skipped');
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️  Supabase credentials not set - auth setup skipped');
    return;
  }

  // Ensure .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('🔐 Setting up authenticated session...');

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Sign in with email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.log(`❌ Authentication failed: ${error.message}`);
      console.log('   Tests requiring authentication will be skipped');
      return;
    }

    if (!data.session) {
      console.log('❌ No session returned from auth');
      return;
    }

    console.log(`✅ Authenticated as: ${testEmail}`);

    // Create browser context and set cookies
    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL: config.projects[0]?.use?.baseURL || 'http://localhost:3000',
    });

    // Set the Supabase auth cookies
    const baseUrl = new URL(config.projects[0]?.use?.baseURL || 'http://localhost:3000');

    await context.addCookies([
      {
        name: 'sb-access-token',
        value: data.session.access_token,
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
      {
        name: 'sb-refresh-token',
        value: data.session.refresh_token,
        domain: baseUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);

    // Navigate to dashboard to verify auth works and set any additional cookies
    const page = await context.newPage();
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30000 });

    // Check if we're authenticated (should be on dashboard, not redirected)
    const finalUrl = page.url();
    if (finalUrl.includes('/landing') || finalUrl.includes('/login')) {
      console.log('❌ Auth cookies not working - still redirected to landing/login');
      await browser.close();
      return;
    }

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
