import { test, expect, Page, BrowserContext } from '@playwright/test'
import { deleteUserByEmail, ensureTestUser, hasAdminConfig } from '../utils/supabase-admin'

// Helper function to generate a unique email for signup tests
function generateUniqueEmail() {
  const timestamp = Date.now()
  return `testuser_${timestamp}@example.com`
}

test.describe('Authentication Performance', () => {
  let page: Page
  let context: BrowserContext
  const defaultPassword = 'TestPassword123!'
  const loginEmail = process.env.E2E_LOGIN_EMAIL || 'e2e.login@complyeur.test'
  const loginPassword = process.env.E2E_LOGIN_PASSWORD || defaultPassword
  const canProvision = hasAdminConfig()

  test.beforeAll(async () => {
    if (!canProvision) return
    const provision = await ensureTestUser({
      email: loginEmail,
      password: loginPassword,
      companyName: 'E2E Performance Test Company',
    })
    if (provision.ok) {
      process.env.E2E_LOGIN_EMAIL = loginEmail
      process.env.E2E_LOGIN_PASSWORD = loginPassword
    }
  })

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    page = await context.newPage()
  })

  test.afterEach(async () => {
    await Promise.allSettled([page.close(), context.close()])
  })

  test('should measure login performance', async () => {
    if (!process.env.E2E_LOGIN_EMAIL || !process.env.E2E_LOGIN_PASSWORD) {
      test.skip(true, 'E2E login credentials are not configured for performance tests.')
    }

    await page.goto('/login')
    const currentUrl = page.url()
    if (currentUrl.includes('/landing') || currentUrl.includes('waitlist')) {
      test.skip(true, 'Login is unavailable in waitlist mode.')
      return
    }

    const emailInput = page.getByLabel(/email/i)
    const hasLoginForm = await emailInput.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasLoginForm) {
      test.skip(true, 'Login form is not available.')
      return
    }

    await emailInput.fill(process.env.E2E_LOGIN_EMAIL!)
    await page.getByLabel(/password/i).fill(process.env.E2E_LOGIN_PASSWORD!)

    const startTime = performance.now()
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard|\/onboarding/) // Wait for authenticated redirect
    const duration = performance.now() - startTime

    console.log(`Login performance: ${duration.toFixed(2)} ms`)
  })

  test('should measure signup performance', async () => {
    const uniqueEmail = generateUniqueEmail()
    await page.goto('/signup')
    const currentUrl = page.url()
    if (currentUrl.includes('/landing') || currentUrl.includes('waitlist')) {
      test.skip(true, 'Signup is unavailable in waitlist mode.')
      return
    }

    const nameInput = page.getByLabel(/name/i)
    const emailInput = page.getByLabel(/email/i)
    const companyInput = page.getByLabel(/company/i)
    const hasSignupForm = await nameInput.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasSignupForm) {
      test.skip(true, 'Signup form is not available.')
      return
    }

    await nameInput.fill('Performance Test User')
    await emailInput.fill(uniqueEmail)
    await companyInput.fill('Performance Test Company')
    await page.locator('input[name="password"]').fill(defaultPassword)
    await page.locator('input[name="confirmPassword"]').fill(defaultPassword)

    const startTime = performance.now()
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/onboarding/) // Wait for navigation to onboarding
    const duration = performance.now() - startTime

    console.log(`Signup performance: ${duration.toFixed(2)} ms`)

    if (canProvision) {
      await deleteUserByEmail(uniqueEmail)
    }
  })
})
