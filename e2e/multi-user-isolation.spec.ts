import { test, expect, type Page, type TestInfo } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createAdminClientFromEnv,
  ensureTestUser,
  getAdminConfigStatus,
} from './utils/supabase-admin'
import { loadLocalEnv } from './utils/env'

loadLocalEnv()

interface SeededEmployee {
  id: string
  name: string
}

interface MultiUserAccount {
  email: string
  password: string
  companyName: string
  userId?: string
  companyId?: string
  markerEmployee?: SeededEmployee
}

interface LoginOutcome {
  ok: boolean
  waitlistMode: boolean
}

const DEFAULT_PASSWORD = 'TestPassword123!'
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const RUN_SUFFIX = Array.from(
  { length: 8 },
  () => LETTERS[Math.floor(Math.random() * LETTERS.length)]
).join('')

const userA: MultiUserAccount = {
  email: process.env.E2E_MULTI_USER_A_EMAIL || 'e2e.multi.a@complyeur.test',
  password: process.env.E2E_MULTI_USER_A_PASSWORD || DEFAULT_PASSWORD,
  companyName: process.env.E2E_MULTI_USER_A_COMPANY || 'E2E Multi User Company A',
}

const userB: MultiUserAccount = {
  email: process.env.E2E_MULTI_USER_B_EMAIL || 'e2e.multi.b@complyeur.test',
  password: process.env.E2E_MULTI_USER_B_PASSWORD || DEFAULT_PASSWORD,
  companyName: process.env.E2E_MULTI_USER_B_COMPANY || 'E2E Multi User Company B',
}

let adminClient: SupabaseClient | null = null
let setupSkipReason: string | null = null

async function login(page: Page, email: string, password: string): Promise<LoginOutcome> {
  await page.goto('/login')

  const currentUrl = page.url()
  const isAuthenticatedRoute = /\/dashboard|\/employee\/|\/employees|\/import|\/calendar/.test(currentUrl)
  if (isAuthenticatedRoute) {
    return { ok: true, waitlistMode: false }
  }

  if (currentUrl.includes('/landing') || currentUrl.includes('waitlist')) {
    return { ok: false, waitlistMode: true }
  }

  const emailInput = page.getByLabel(/email/i)
  const hasLoginForm = await emailInput.isVisible({ timeout: 5000 }).catch(() => false)
  if (!hasLoginForm) {
    const redirectedUrl = page.url()
    if (/\/dashboard|\/employee\/|\/employees|\/import|\/calendar/.test(redirectedUrl)) {
      return { ok: true, waitlistMode: false }
    }
    return { ok: false, waitlistMode: false }
  }

  await emailInput.fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in|sign in with email/i }).click()

  try {
    await page.waitForURL(/\/dashboard|\/employee\/|\/employees|\/import|\/calendar/, {
      timeout: 15000,
    })
    return { ok: true, waitlistMode: false }
  } catch {
    return { ok: false, waitlistMode: false }
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
    .maybeSingle()

  if (error || !data?.company_id) {
    return null
  }

  return data.company_id
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
    .eq('id', userId)

  return !error
}

async function seedEmployee(
  supabase: SupabaseClient,
  companyId: string,
  name: string
): Promise<SeededEmployee | null> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      company_id: companyId,
      name,
      nationality_type: 'uk_citizen',
    })
    .select('id, name')
    .single()

  if (error || !data) {
    console.log(`Failed to seed employee ${name}: ${error?.message ?? 'unknown error'}`)
    return null
  }

  return data
}

function getBaseUrl(testInfo: TestInfo): string {
  const baseURL = testInfo.project.use.baseURL
  if (typeof baseURL !== 'string' || !baseURL) {
    throw new Error('Playwright baseURL is required for multi-user isolation tests.')
  }
  return baseURL
}

async function expectDashboardSearchResult(
  page: Page,
  employeeName: string,
  shouldExist: boolean
): Promise<void> {
  await page.goto(`/dashboard?search=${encodeURIComponent(employeeName)}`)
  await page.waitForLoadState('networkidle')

  const employeeLinks = page
    .locator('a[href^="/employee/"]')
    .filter({ hasText: employeeName })

  if (shouldExist) {
    await expect(employeeLinks.first()).toBeVisible({ timeout: 15000 })
  } else {
    await expect(employeeLinks).toHaveCount(0)
    await expect(page.getByText(employeeName)).toHaveCount(0)
  }
}

test.describe('Multi-User Dashboard Isolation', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    const adminStatus = getAdminConfigStatus()
    if (adminStatus.ok === false) {
      setupSkipReason = adminStatus.reason
      return
    }

    adminClient = createAdminClientFromEnv()

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
    ])

    if (!provisionA.ok || !provisionA.userId) {
      setupSkipReason = provisionA.reason ?? 'Failed to provision user A.'
      return
    }

    if (!provisionB.ok || !provisionB.userId) {
      setupSkipReason = provisionB.reason ?? 'Failed to provision user B.'
      return
    }

    userA.userId = provisionA.userId
    userB.userId = provisionB.userId

    const [onboardingAOk, onboardingBOk] = await Promise.all([
      markOnboardingComplete(adminClient, userA.userId),
      markOnboardingComplete(adminClient, userB.userId),
    ])

    if (!onboardingAOk || !onboardingBOk) {
      setupSkipReason = 'Failed to complete onboarding for one or more test users.'
      return
    }

    const [companyA, companyB] = await Promise.all([
      getCompanyIdForUser(adminClient, userA.userId),
      getCompanyIdForUser(adminClient, userB.userId),
    ])

    userA.companyId = companyA ?? undefined
    userB.companyId = companyB ?? undefined

    if (!userA.companyId || !userB.companyId) {
      setupSkipReason = 'Failed to resolve company IDs for provisioned users.'
      return
    }

    if (userA.companyId === userB.companyId) {
      setupSkipReason = 'Provisioned test users belong to the same company; isolation test requires two tenants.'
      return
    }

    const [employeeA, employeeB] = await Promise.all([
      seedEmployee(adminClient, userA.companyId, `Isolation Alpha ${RUN_SUFFIX}`),
      seedEmployee(adminClient, userB.companyId, `Isolation Bravo ${RUN_SUFFIX}`),
    ])

    if (!employeeA || !employeeB) {
      setupSkipReason = 'Failed to seed marker employees for isolated tenants.'
      return
    }

    userA.markerEmployee = employeeA
    userB.markerEmployee = employeeB
  })

  test.afterAll(async () => {
    if (adminClient) {
      const employeeIds = [userA.markerEmployee?.id, userB.markerEmployee?.id].filter(Boolean) as string[]
      if (employeeIds.length > 0) {
        const { error } = await adminClient
          .from('employees')
          .delete()
          .in('id', employeeIds)

        if (error) {
          console.log(`Failed to clean up seeded employees: ${error.message}`)
        }
      }
    }
  })

  test('dashboard search only returns employees from the signed-in tenant', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120000)

    if (setupSkipReason) {
      test.skip(true, setupSkipReason)
      return
    }

    if (!userA.markerEmployee || !userB.markerEmployee) {
      test.skip(true, 'Marker employees were not created.')
      return
    }

    const baseURL = getBaseUrl(testInfo)
    const emptyStorageState = { cookies: [], origins: [] }
    const contextA = await browser.newContext({ baseURL, storageState: emptyStorageState })
    const contextB = await browser.newContext({ baseURL, storageState: emptyStorageState })

    try {
      const pageA = await contextA.newPage()
      const loginA = await login(pageA, userA.email, userA.password)
      if (loginA.waitlistMode) {
        test.skip(true, 'App is in waitlist mode.')
      }
      expect(loginA.ok).toBe(true)

      await expectDashboardSearchResult(pageA, userA.markerEmployee.name, true)
      await expectDashboardSearchResult(pageA, userB.markerEmployee.name, false)

      const pageB = await contextB.newPage()
      const loginB = await login(pageB, userB.email, userB.password)
      if (loginB.waitlistMode) {
        test.skip(true, 'App is in waitlist mode.')
      }
      expect(loginB.ok).toBe(true)

      await expectDashboardSearchResult(pageB, userB.markerEmployee.name, true)
      await expectDashboardSearchResult(pageB, userA.markerEmployee.name, false)
    } finally {
      await Promise.allSettled([contextA.close(), contextB.close()])
    }
  })

  test('direct detail routes and DSAR downloads deny cross-tenant access', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120000)

    if (setupSkipReason) {
      test.skip(true, setupSkipReason)
      return
    }

    if (!userA.markerEmployee || !userB.markerEmployee) {
      test.skip(true, 'Marker employees were not created.')
      return
    }

    const baseURL = getBaseUrl(testInfo)
    const emptyStorageState = { cookies: [], origins: [] }
    const contextA = await browser.newContext({ baseURL, storageState: emptyStorageState })
    const contextB = await browser.newContext({ baseURL, storageState: emptyStorageState })

    try {
      const pageA = await contextA.newPage()
      const loginA = await login(pageA, userA.email, userA.password)
      if (loginA.waitlistMode) {
        test.skip(true, 'App is in waitlist mode.')
      }
      expect(loginA.ok).toBe(true)

      await pageA.goto(`/employee/${userA.markerEmployee.id}`)
      await expect(
        pageA.getByRole('heading', { name: userA.markerEmployee.name })
      ).toBeVisible({ timeout: 15000 })

      const ownDsarResponse = await contextA.request.get(
        `/api/gdpr/dsar/${userA.markerEmployee.id}`
      )
      expect(ownDsarResponse.status()).toBe(200)
      expect(ownDsarResponse.headers()['content-type']).toContain('application/zip')
      expect(ownDsarResponse.headers()['cache-control']).toContain('no-store')

      const pageB = await contextB.newPage()
      const loginB = await login(pageB, userB.email, userB.password)
      if (loginB.waitlistMode) {
        test.skip(true, 'App is in waitlist mode.')
      }
      expect(loginB.ok).toBe(true)

      await pageB.goto(`/employee/${userA.markerEmployee.id}`)
      await expect(
        pageB.getByRole('heading', { name: 'Page not found' })
      ).toBeVisible({ timeout: 15000 })
      await expect(pageB.getByText(userA.markerEmployee.name)).toHaveCount(0)

      const crossTenantDsarResponse = await contextB.request.get(
        `/api/gdpr/dsar/${userA.markerEmployee.id}`
      )
      expect(crossTenantDsarResponse.status()).toBe(404)

      const crossTenantDsarBody = await crossTenantDsarResponse.json()
      expect(crossTenantDsarBody).toMatchObject({
        error: expect.stringMatching(/employee not found|access denied/i),
      })
    } finally {
      await Promise.allSettled([contextA.close(), contextB.close()])
    }
  })
})
