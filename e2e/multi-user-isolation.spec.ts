import { test, expect, Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ensureTestUser, hasAdminConfig } from './utils/supabase-admin';
import { loadLocalEnv } from './utils/env';

loadLocalEnv();

interface MultiUserAccount {
  email: string;
  password: string;
  companyName: string;
  userId?: string;
  companyId?: string;
  markerEmployeeName?: string;
}

interface LoginOutcome {
  ok: boolean;
  waitlistMode: boolean;
}

const DEFAULT_PASSWORD = 'TestPassword123!';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const RUN_SUFFIX = Array.from({ length: 8 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

const userA: MultiUserAccount = {
  email: process.env.E2E_MULTI_USER_A_EMAIL || 'e2e.multi.a@complyeur.test',
  password: process.env.E2E_MULTI_USER_A_PASSWORD || DEFAULT_PASSWORD,
  companyName: process.env.E2E_MULTI_USER_A_COMPANY || 'E2E Multi User Company A',
};

const userB: MultiUserAccount = {
  email: process.env.E2E_MULTI_USER_B_EMAIL || 'e2e.multi.b@complyeur.test',
  password: process.env.E2E_MULTI_USER_B_PASSWORD || DEFAULT_PASSWORD,
  companyName: process.env.E2E_MULTI_USER_B_COMPANY || 'E2E Multi User Company B',
};

let adminClient: SupabaseClient | null = null;
let setupSkipReason: string | null = null;

async function login(page: Page, email: string, password: string): Promise<LoginOutcome> {
  await page.goto('/login');

  const currentUrl = page.url();
  const isAuthenticatedRoute = /\/dashboard|\/employees|\/import|\/calendar/.test(currentUrl);
  if (isAuthenticatedRoute) {
    return { ok: true, waitlistMode: false };
  }

  if (currentUrl.includes('/landing') || currentUrl.includes('waitlist')) {
    return { ok: false, waitlistMode: true };
  }

  const emailInput = page.getByLabel(/email/i);
  const hasLoginForm = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (!hasLoginForm) {
    const redirectedUrl = page.url();
    if (/\/dashboard|\/employees|\/import|\/calendar/.test(redirectedUrl)) {
      return { ok: true, waitlistMode: false };
    }
    return { ok: false, waitlistMode: false };
  }

  await emailInput.fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|sign in with email/i }).click();

  try {
    await page.waitForURL(/\/dashboard|\/employees|\/import|\/calendar/, { timeout: 15000 });
    return { ok: true, waitlistMode: false };
  } catch {
    return { ok: false, waitlistMode: false };
  }
}

async function getCompanyIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data?.company_id) {
    return null;
  }

  return data.company_id;
}

async function markOnboardingComplete(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_completed_at: new Date().toISOString(),
      dashboard_tour_completed_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return !error;
}

async function addEmployeeViaUi(page: Page, employeeName: string): Promise<void> {
  const tourDialog = page.getByRole('dialog', { name: /dashboard onboarding tour/i });
  const tourVisible = await tourDialog.isVisible().catch(() => false);
  if (tourVisible) {
    await tourDialog.getByRole('button', { name: /^Skip$/i }).click();
    await expect(tourDialog).not.toBeVisible({ timeout: 10000 });
  }

  const addButton = page.getByRole('button', { name: /^Add Employee$/ }).first();
  await addButton.click();

  const dialog = page.getByRole('dialog', { name: /Add Employee/i });
  await expect(dialog).toBeVisible({ timeout: 10000 });

  await dialog.getByPlaceholder('Enter employee name').fill(employeeName);
  await dialog.getByRole('button', { name: /^Add Employee$/ }).click();

  await expect(dialog).not.toBeVisible({ timeout: 15000 });
  await expect(page.getByText(employeeName).first()).toBeVisible({ timeout: 15000 });
}

test.describe('Multi-User Dashboard Isolation', () => {
  test.beforeAll(async () => {
    if (!hasAdminConfig()) {
      setupSkipReason = 'Missing Supabase admin credentials for multi-user provisioning.';
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      setupSkipReason = 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.';
      return;
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const [provisionA, provisionB] = await Promise.all([
      ensureTestUser({
        email: userA.email,
        password: userA.password,
        companyName: userA.companyName,
      }),
      ensureTestUser({
        email: userB.email,
        password: userB.password,
        companyName: userB.companyName,
      }),
    ]);

    if (!provisionA.ok || !provisionA.userId) {
      setupSkipReason = provisionA.reason ?? 'Failed to provision user A.';
      return;
    }

    if (!provisionB.ok || !provisionB.userId) {
      setupSkipReason = provisionB.reason ?? 'Failed to provision user B.';
      return;
    }

    userA.userId = provisionA.userId;
    userB.userId = provisionB.userId;

    const [onboardingAOk, onboardingBOk] = await Promise.all([
      markOnboardingComplete(adminClient, userA.userId),
      markOnboardingComplete(adminClient, userB.userId),
    ]);

    if (!onboardingAOk || !onboardingBOk) {
      setupSkipReason = 'Failed to complete onboarding for one or more test users.';
      return;
    }

    const companyA = await getCompanyIdForUser(adminClient, userA.userId);
    const companyB = await getCompanyIdForUser(adminClient, userB.userId);
    userA.companyId = companyA ?? undefined;
    userB.companyId = companyB ?? undefined;

    if (!userA.companyId || !userB.companyId) {
      setupSkipReason = 'Failed to resolve company IDs for provisioned users.';
      return;
    }

    if (userA.companyId === userB.companyId) {
      setupSkipReason = 'Provisioned test users belong to the same company; isolation test requires two tenants.';
      return;
    }

    userA.markerEmployeeName = `Isolation Alpha ${RUN_SUFFIX}`;
    userB.markerEmployeeName = `Isolation Bravo ${RUN_SUFFIX}`;
  });

  test.afterAll(async () => {
    if (!adminClient || !userA.markerEmployeeName || !userB.markerEmployeeName) {
      return;
    }

    const { error } = await adminClient
      .from('employees')
      .delete()
      .in('name', [userA.markerEmployeeName, userB.markerEmployeeName]);

    if (error) {
      console.log(`Failed to clean up marker employees: ${error.message}`);
    }
  });

  test('users can only see employees from their own company', async ({ browser }) => {
    test.setTimeout(120000);

    if (setupSkipReason) {
      test.skip(true, setupSkipReason);
      return;
    }

    if (!userA.markerEmployeeName || !userB.markerEmployeeName) {
      test.skip(true, 'Marker employees were not created.');
      return;
    }

    const emptyStorageState = { cookies: [], origins: [] };
    const contextA = await browser.newContext({ storageState: emptyStorageState });
    const contextB = await browser.newContext({ storageState: emptyStorageState });

    try {
      const pageA = await contextA.newPage();
      const loginA = await login(pageA, userA.email, userA.password);
      if (loginA.waitlistMode) {
        test.skip(true, 'App is in waitlist mode.');
      }
      expect(loginA.ok).toBe(true);

      await pageA.goto('/dashboard');
      await addEmployeeViaUi(pageA, userA.markerEmployeeName);

      await pageA.goto(`/dashboard?search=${encodeURIComponent(userB.markerEmployeeName)}`);
      await expect(pageA.getByText(userB.markerEmployeeName)).toHaveCount(0);

      const pageB = await contextB.newPage();
      const loginB = await login(pageB, userB.email, userB.password);
      if (loginB.waitlistMode) {
        test.skip(true, 'App is in waitlist mode.');
      }
      expect(loginB.ok).toBe(true);

      await pageB.goto('/dashboard');
      await addEmployeeViaUi(pageB, userB.markerEmployeeName);

      await pageB.goto(`/dashboard?search=${encodeURIComponent(userA.markerEmployeeName)}`);
      await expect(pageB.getByText(userA.markerEmployeeName)).toHaveCount(0);
    } finally {
      await Promise.allSettled([contextA.close(), contextB.close()]);
    }
  });
});
