import { test, expect, Page } from '@playwright/test'

async function ensureCalendarAccess(page: Page): Promise<boolean> {
  await page.goto('/calendar')

  if (/\/calendar/.test(page.url())) {
    return true
  }

  if (page.url().includes('/landing') || page.url().includes('waitlist')) {
    return false
  }

  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    return false
  }

  const emailInput = page.getByLabel(/email/i)
  const hasLoginForm = await emailInput.isVisible({ timeout: 5000 }).catch(() => false)
  if (!hasLoginForm) {
    return false
  }

  await emailInput.fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in|sign in with email/i }).click()
  await page.waitForURL(/\/dashboard|\/employees|\/import|\/calendar/, { timeout: 15000 })
  await page.goto('/calendar')

  return /\/calendar/.test(page.url())
}

test.describe('Calendar Performance Guardrails', () => {
  test('timeline scroll stays within budget and emits metrics', async ({ page }) => {
    test.setTimeout(90000)

    const hasAccess = await ensureCalendarAccess(page)
    if (!hasAccess) {
      test.skip(true, 'Skipping: calendar is not accessible in this environment.')
      return
    }

    await page.waitForLoadState('networkidle')

    const timeline = page.getByTestId('calendar-timeline-viewport')
    await expect(timeline).toBeVisible({ timeout: 15000 })

    const metrics = await page.evaluate(async () => {
      const timelineEl = document.querySelector<HTMLElement>('[data-testid="calendar-timeline-viewport"]')
      if (!timelineEl) {
        return {
          supported: false,
          supportsLongTaskObserver: false,
          maxFrameMs: Number.POSITIVE_INFINITY,
          framesOver50Ms: Number.POSITIVE_INFINITY,
          longTasks: Number.POSITIVE_INFINITY,
          emittedScrollMetrics: 0,
        }
      }

      let longTasks = 0
      const supportsLongTaskObserver =
        typeof PerformanceObserver !== 'undefined' &&
        Array.isArray(PerformanceObserver.supportedEntryTypes) &&
        PerformanceObserver.supportedEntryTypes.includes('longtask')

      const longTaskObserver = supportsLongTaskObserver
        ? new PerformanceObserver((list) => {
            longTasks += list.getEntries().length
          })
        : null

      if (longTaskObserver) {
        longTaskObserver.observe({ type: 'longtask', buffered: true })
      }

      let last = performance.now()
      let maxFrameMs = 0
      let framesOver50Ms = 0
      const totalFrames = 180

      for (let frame = 0; frame < totalFrames; frame += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const now = performance.now()
        const delta = now - last
        last = now

        maxFrameMs = Math.max(maxFrameMs, delta)
        if (delta > 50) {
          framesOver50Ms += 1
        }

        if (frame % 2 === 0) {
          timelineEl.scrollTop += 72
        }
      }

      longTaskObserver?.disconnect()

      const emittedScrollMetrics = (window.__complyeurCalendarMetrics ?? []).filter(
        (item) => item.name === 'scroll_sync'
      ).length

      return {
        supported: true,
        supportsLongTaskObserver,
        maxFrameMs,
        framesOver50Ms,
        longTasks,
        emittedScrollMetrics,
      }
    })

    expect(metrics.supported).toBe(true)
    expect(metrics.maxFrameMs).toBeLessThan(120)
    expect(metrics.framesOver50Ms).toBeLessThan(14)
    expect(metrics.emittedScrollMetrics).toBeGreaterThan(0)

    if (metrics.supportsLongTaskObserver) {
      expect(metrics.longTasks).toBeLessThan(8)
    }
  })
})

