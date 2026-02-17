import { test, expect, Page } from '@playwright/test'
import { deleteUserByEmail, ensureTestUser, hasAdminConfig } from '../utils/supabase-admin'

// Helper function to generate a unique email for signup tests
function generateUniqueEmail() {
  const timestamp = Date.now()
  return `testuser_${timestamp}@example.com`
}

test.describe('Authentication Performance', () => {
  let page: Page
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
    page = await browser.newPage()
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should measure login performance', async () => {
    if (!process.env.E2E_LOGIN_EMAIL || !process.env.E2E_LOGIN_PASSWORD) {
      test.skip(true, 'E2E login credentials are not configured for performance tests.')
    }

    await page.goto('/login')

    await page.getByLabel('Email').fill(process.env.E2E_LOGIN_EMAIL!)
    await page.getByLabel('Password').fill(process.env.E2E_LOGIN_PASSWORD!)

    const startTime = performance.now()
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/) // Wait for navigation to the dashboard
    const duration = performance.now() - startTime

    console.log(`Login performance: ${duration.toFixed(2)} ms`)
  })

  test('should measure signup performance', async () => {
    const uniqueEmail = generateUniqueEmail()
    await page.goto('/signup')

    await page.getByLabel('Name').fill('Performance Test User')
    await page.getByLabel('Email').fill(uniqueEmail)
    await page.getByLabel('Company').fill('Performance Test Company')
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
