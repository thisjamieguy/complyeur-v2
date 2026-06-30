import { expect, type Locator, type Page, test } from '@playwright/test';
import { createChunks, stringToBase64URL } from '@supabase/ssr';
import { createClient, type Session } from '@supabase/supabase-js';
import { loadLocalEnv } from './utils/env';
import {
  createAdminClientFromEnv,
  ensureTestUser,
  getAdminConfigStatus,
} from './utils/supabase-admin';

loadLocalEnv();

const EMPLOYEE_PREFIX = 'AAA Calendar V2 E2E';
const TEST_COMPANY_NAME = 'Playwright Calendar V2 Company';
const SUPABASE_COOKIE_PREFIX = 'base64-';

interface SeedData {
  sourceEmployeeId: string;
  sourceEmployeeName: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
}

async function cleanupCalendarTestData(): Promise<void> {
  const adminStatus = getAdminConfigStatus();
  if (adminStatus.ok === false) return;

  const supabase = createAdminClientFromEnv();
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .like('name', `${EMPLOYEE_PREFIX}%`);

  const employeeIds = employees?.map((employee) => employee.id) ?? [];
  if (employeeIds.length === 0) return;

  await supabase.from('trips').delete().in('employee_id', employeeIds);
  await supabase.from('employees').delete().in('id', employeeIds);
}

async function seedCalendarTestData(): Promise<
  | { ok: true; data: SeedData }
  | { ok: false; reason: string }
> {
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  if (!testEmail || !testPassword) {
    return {
      ok: false,
      reason: 'TEST_USER_EMAIL and TEST_USER_PASSWORD are required.',
    };
  }

  const adminStatus = getAdminConfigStatus();
  if (adminStatus.ok === false) {
    return { ok: false, reason: adminStatus.reason };
  }

  const provisionedUser = await ensureTestUser({
    email: testEmail,
    password: testPassword,
    companyName: TEST_COMPANY_NAME,
  });
  if (!provisionedUser.ok || !provisionedUser.userId) {
    return {
      ok: false,
      reason: provisionedUser.reason ?? 'Unable to provision test user.',
    };
  }

  const supabase = createAdminClientFromEnv();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', provisionedUser.userId)
    .single();

  if (profileError || !profile?.company_id) {
    return {
      ok: false,
      reason: profileError?.message ?? 'Test user has no company_id.',
    };
  }

  await cleanupCalendarTestData();

  const runId = Date.now().toString(36);
  const sourceEmployeeName = `${EMPLOYEE_PREFIX} Alice ${runId}`;
  const targetEmployeeName = `${EMPLOYEE_PREFIX} Emma ${runId}`;

  const { data: employees, error: employeeError } = await supabase
    .from('employees')
    .insert([
      {
        company_id: profile.company_id,
        name: sourceEmployeeName,
        email: `calendar-source-${runId}@e2e.example.com`,
        nationality_type: 'uk_citizen',
      },
      {
        company_id: profile.company_id,
        name: targetEmployeeName,
        email: `calendar-target-${runId}@e2e.example.com`,
        nationality_type: 'uk_citizen',
      },
    ])
    .select('id, name');

  if (employeeError || !employees || employees.length !== 2) {
    return {
      ok: false,
      reason: employeeError?.message ?? 'Unable to seed employees.',
    };
  }

  const sourceEmployee = employees.find((employee) => employee.name === sourceEmployeeName);
  const targetEmployee = employees.find((employee) => employee.name === targetEmployeeName);
  if (!sourceEmployee || !targetEmployee) {
    return { ok: false, reason: 'Seeded employees could not be resolved.' };
  }

  const { error: tripError } = await supabase.from('trips').insert([
    {
      company_id: profile.company_id,
      employee_id: sourceEmployee.id,
      country: 'FR',
      entry_date: '2026-07-06',
      exit_date: '2026-07-08',
      purpose: 'Client workshop',
      job_ref: 'E2E-CAL-1',
      is_private: false,
      ghosted: false,
    },
    {
      company_id: profile.company_id,
      employee_id: targetEmployee.id,
      country: 'DE',
      entry_date: '2026-07-20',
      exit_date: '2026-07-22',
      purpose: 'Visibility marker',
      job_ref: 'E2E-CAL-2',
      is_private: false,
      ghosted: false,
    },
  ]);

  if (tripError) {
    return { ok: false, reason: tripError.message };
  }

  return {
    ok: true,
    data: {
      sourceEmployeeId: sourceEmployee.id,
      sourceEmployeeName,
      targetEmployeeId: targetEmployee.id,
      targetEmployeeName,
    },
  };
}

async function ensureAuthenticated(page: Page): Promise<boolean> {
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!testEmail || !testPassword || !supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error || !data.session) {
    return false;
  }

  await installSupabaseSessionCookie(page, supabaseUrl, data.session);
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  return !page.url().includes('/login');
}

async function installSupabaseSessionCookie(
  page: Page,
  supabaseUrl: string,
  session: Session
): Promise<void> {
  const storageKey = getSupabaseStorageKey(supabaseUrl);
  const encodedSession =
    SUPABASE_COOKIE_PREFIX + stringToBase64URL(JSON.stringify(session));
  const expires = session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
  const appUrl = getPlaywrightBaseUrl();
  const cookies = createChunks(storageKey, encodedSession).map(({ name, value }) => ({
    name,
    value,
    url: appUrl,
    expires,
    httpOnly: true,
    secure: appUrl.startsWith('https://'),
    sameSite: 'Lax' as const,
  }));

  await page.context().clearCookies();
  await page.context().addCookies(cookies);
}

function getSupabaseStorageKey(supabaseUrl: string): string {
  const supabaseHostNamespace = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${supabaseHostNamespace}-auth-token`;
}

function getPlaywrightBaseUrl(): string {
  const port = process.env.PLAYWRIGHT_PORT ?? '3100';
  return `http://127.0.0.1:${port}`;
}

function calendarButtonForEmployee(
  page: Page,
  employeeId: string,
  ariaLabel: string
) {
  return page.locator(
    `[data-calendar-employee-row][data-employee-id="${employeeId}"] button[aria-label="${ariaLabel}"]`
  );
}

async function openSeededCalendar(page: Page): Promise<SeedData> {
  const seeded = await seedCalendarTestData();
  test.skip(seeded.ok === false, seeded.ok === false ? seeded.reason : '');
  if (seeded.ok === false) {
    throw new Error(seeded.reason);
  }

  const authenticated = await ensureAuthenticated(page);
  test.skip(!authenticated, 'Unable to authenticate test user.');

  await expect(
    page.getByRole('heading', { name: /interactive travel calendar/i })
  ).toBeVisible({ timeout: 30000 });

  return seeded.data;
}

async function dragLocatorToLocator(
  page: Page,
  source: Locator,
  target: Locator
): Promise<void> {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error('Cannot drag between elements without visible bounding boxes.');
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 }
  );
  await page.mouse.up();
}

async function selectCountryFromDialog(
  page: Page,
  dialog: Locator,
  countryName: string
): Promise<void> {
  await dialog.getByRole('combobox').click();
  await page.getByPlaceholder('Search country...').fill(countryName);
  await page.getByText(countryName, { exact: true }).click();
}

test.describe('Calendar v2 interactive context menu', () => {
  test.afterEach(async () => {
    await cleanupCalendarTestData();
  });

  test('supports right-click trip workflows', async ({ page }) => {
    test.setTimeout(90000);

    const seeded = await openSeededCalendar(page);

    const sourceTrip = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'FR trip on Jul 6'
    );
    const targetEmptyCell = calendarButtonForEmployee(
      page,
      seeded.targetEmployeeId,
      'Add trip on Jul 10'
    );

    await expect(sourceTrip).toBeVisible({ timeout: 30000 });
    await expect(targetEmptyCell).toBeVisible({ timeout: 30000 });

    await targetEmptyCell.click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Add trip' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Add trip' }).click();
    await expect(page.getByRole('dialog', { name: 'Add trip' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await sourceTrip.click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Edit trip' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete trip' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Copy trip' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Paste trip here' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Go to employee profile' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Mark as private' })).toBeVisible();

    await page.getByRole('menuitem', { name: 'Edit trip' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit trip' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await sourceTrip.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Copy trip' }).click();
    await expect(page.getByText('Trip copied')).toBeVisible({ timeout: 10000 });

    await targetEmptyCell.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Paste trip here' }).click();
    await expect(page.getByText('Trip pasted successfully')).toBeVisible({ timeout: 15000 });

    const pastedTrip = calendarButtonForEmployee(
      page,
      seeded.targetEmployeeId,
      'FR trip on Jul 10'
    );
    await expect(pastedTrip).toBeVisible({ timeout: 30000 });

    await sourceTrip.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Mark as private' }).click();
    await expect(page.getByText('Trip marked as private')).toBeVisible({ timeout: 15000 });

    const privateTrip = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'XX trip on Jul 6'
    );
    await expect(privateTrip).toBeVisible({ timeout: 30000 });

    await privateTrip.click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Mark as work trip' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Mark as work trip' }).click();
    await expect(page.getByText('Trip marked as work trip')).toBeVisible({ timeout: 15000 });
    await expect(sourceTrip).toBeVisible({ timeout: 30000 });

    await pastedTrip.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete trip' }).click();
    await expect(page.getByRole('alertdialog', { name: /delete trip/i })).toBeVisible();
    await page.getByRole('button', { name: 'Delete Trip' }).click();
    await expect(page.getByText('Trip deleted successfully')).toBeVisible({ timeout: 15000 });
    await expect(pastedTrip).toBeHidden({ timeout: 30000 });

    await sourceTrip.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Go to employee profile' }).click();
    await expect(page).toHaveURL(new RegExp(`/employee/${seeded.sourceEmployeeId}`));
  });

  test('edits and deletes trips from the context menu', async ({ page }) => {
    test.setTimeout(90000);

    const seeded = await openSeededCalendar(page);
    const sourceTrip = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'FR trip on Jul 6'
    );

    await expect(sourceTrip).toBeVisible({ timeout: 30000 });
    await sourceTrip.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Edit trip' }).click();

    const dialog = page.getByRole('dialog', { name: 'Edit trip' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Purpose/i).fill('Updated calendar purpose');
    await dialog.getByLabel(/Job Reference/i).fill('E2E-EDITED');
    await dialog.getByRole('button', { name: 'Update Trip' }).click();

    await expect(page.getByText('Trip updated successfully')).toBeVisible({
      timeout: 15000,
    });
    await expect(sourceTrip).toBeVisible({ timeout: 30000 });

    await sourceTrip.click();
    await expect(page.getByText('Updated calendar purpose')).toBeVisible({
      timeout: 15000,
    });
    await page.keyboard.press('Escape');

    await sourceTrip.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete trip' }).click();
    await expect(page.getByRole('alertdialog', { name: /delete trip/i })).toBeVisible();
    await page.getByRole('button', { name: 'Delete Trip' }).click();
    await expect(page.getByText('Trip deleted successfully')).toBeVisible({
      timeout: 15000,
    });
    await expect(sourceTrip).toBeHidden({ timeout: 30000 });
  });

  test('shifts a trip to a new date by dragging horizontally', async ({ page }) => {
    test.setTimeout(90000);

    const seeded = await openSeededCalendar(page);
    const sourceTrip = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'FR trip on Jul 6'
    );
    const targetCell = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'Add trip on Jul 10'
    );

    await expect(sourceTrip).toBeVisible({ timeout: 30000 });
    await expect(targetCell).toBeVisible({ timeout: 30000 });

    await dragLocatorToLocator(page, sourceTrip, targetCell);

    await expect(page.getByText('Trip dates updated')).toBeVisible({
      timeout: 15000,
    });
    await expect(sourceTrip).toBeHidden({ timeout: 30000 });
    await expect(
      calendarButtonForEmployee(page, seeded.sourceEmployeeId, 'FR trip on Jul 10')
    ).toBeVisible({ timeout: 30000 });
  });

  test('moves a trip to another employee and date by dragging diagonally', async ({ page }) => {
    test.setTimeout(90000);

    const seeded = await openSeededCalendar(page);
    const sourceTrip = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'FR trip on Jul 6'
    );
    const targetCell = calendarButtonForEmployee(
      page,
      seeded.targetEmployeeId,
      'Add trip on Jul 12'
    );

    await expect(sourceTrip).toBeVisible({ timeout: 30000 });
    await expect(targetCell).toBeVisible({ timeout: 30000 });

    await dragLocatorToLocator(page, sourceTrip, targetCell);

    await expect(page.getByRole('dialog', { name: 'Move trip?' })).toBeVisible();
    await page.getByRole('button', { name: 'Move Trip' }).click();

    await expect(page.getByText('Trip moved and dates updated')).toBeVisible({
      timeout: 15000,
    });
    await expect(sourceTrip).toBeHidden({ timeout: 30000 });
    await expect(
      calendarButtonForEmployee(page, seeded.targetEmployeeId, 'FR trip on Jul 12')
    ).toBeVisible({ timeout: 30000 });
  });

  test('rejects dragging a trip onto an overlapping target trip', async ({ page }) => {
    test.setTimeout(90000);

    const seeded = await openSeededCalendar(page);
    const sourceTrip = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'FR trip on Jul 6'
    );
    const overlappingTrip = calendarButtonForEmployee(
      page,
      seeded.targetEmployeeId,
      'DE trip on Jul 20'
    );

    await expect(sourceTrip).toBeVisible({ timeout: 30000 });
    await expect(overlappingTrip).toBeVisible({ timeout: 30000 });

    await dragLocatorToLocator(page, sourceTrip, overlappingTrip);

    const moveDialog = page.getByRole('dialog', { name: 'Move trip?' });
    await expect(moveDialog).toBeVisible();
    await page.getByRole('button', { name: 'Move Trip' }).click();

    await expect(page.getByText('Trip overlap detected')).toBeVisible({
      timeout: 15000,
    });
    await expect(moveDialog.getByText(/Cannot move trip\./)).toBeVisible();
    await expect(sourceTrip).toBeVisible();
    await expect(
      calendarButtonForEmployee(page, seeded.targetEmployeeId, 'FR trip on Jul 20')
    ).toBeHidden();
    await moveDialog.getByRole('button', { name: 'Cancel' }).click();
  });

  test('shows a calendar-created trip on the employee profile', async ({ page }) => {
    test.setTimeout(90000);

    const seeded = await openSeededCalendar(page);
    const createCell = calendarButtonForEmployee(
      page,
      seeded.sourceEmployeeId,
      'Add trip on Jul 15'
    );

    await expect(createCell).toBeVisible({ timeout: 30000 });
    await createCell.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Add trip' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add trip' });
    await expect(dialog).toBeVisible();
    await selectCountryFromDialog(page, dialog, 'Spain');
    await dialog.getByLabel('Exit Date').fill('2026-07-16');
    await dialog.getByLabel(/Purpose/i).fill('E2E profile sync');
    await dialog.getByLabel(/Job Reference/i).fill('E2E-PROFILE');
    await dialog.getByRole('button', { name: 'Create Trip' }).click();

    await expect(page.getByText('Trip created successfully')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      calendarButtonForEmployee(page, seeded.sourceEmployeeId, 'ES trip on Jul 15')
    ).toBeVisible({ timeout: 30000 });

    await page.goto(`/employee/${seeded.sourceEmployeeId}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByRole('heading', { name: seeded.sourceEmployeeName })
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Travel History', { exact: true })).toBeVisible();
    const travelHistoryRow = page
      .getByRole('table')
      .getByRole('row')
      .filter({ hasText: 'Spain' })
      .filter({ hasText: '15 Jul 2026 - 16 Jul 2026' })
      .filter({ hasText: 'E2E profile sync' });
    await expect(travelHistoryRow).toBeVisible({ timeout: 30000 });
  });
});
