import { test, expect, Page } from '@playwright/test'

// Helper function to generate a unique email for signup tests
function generateUniqueEmail() {
  const timestamp = Date.now()
  return `testuser+${timestamp}@example.com`
}

test.describe('Authentication Performance', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should measure login performance', async () => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com') // Assuming a pre-existing test user
    await page.fill('input[name="password"]', 'TestPassword123!') // Assuming a pre-existing test user

    const startTime = performance.now()
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard') // Wait for navigation to the dashboard
    const duration = performance.now() - startTime

    console.log(`Login performance: ${duration.toFixed(2)} ms`)
  })

  test('should measure signup performance', async () => {
    const uniqueEmail = generateUniqueEmail()
    await page.goto('/signup')

    await page.fill('input[name="email"]', uniqueEmail)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    await page.fill('input[name="companyName"]', 'Performance Test Company')
    await page.click('input[type="checkbox"][name="termsAccepted"]') // Assuming a checkbox for terms

    const startTime = performance.now()
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard') // Wait for navigation to the dashboard
    const duration = performance.now() - startTime

    console.log(`Signup performance: ${duration.toFixed(2)} ms`)

    // Optional: Clean up the created user if possible, e.g., via an API call
    // This would require more advanced setup not covered in this basic example.
  })
})
