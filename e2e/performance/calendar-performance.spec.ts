import { test, expect, Page } from '@playwright/test'
import { loadLocalEnv } from '../utils/env'
import {
  createAdminClientFromEnv,
  ensureTestUser,
  getAdminConfigStatus,
} from '../utils/supabase-admin'

loadLocalEnv()

const PERF_EMPLOYEE_PREFIX = 'AAA Perf Guardrail E2E'
const PERF_EMPLOYEE_COUNT = 40
const PERF_TRIPS_PER_EMPLOYEE = 5

function isoDaysFromToday(offset: number): string {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().split('T')[0]
}

async function cleanupPerfSeedData(): Promise<void> {
  if (getAdminConfigStatus().ok === false) return

  const supabase = createAdminClientFromEnv()
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .like('name', `${PERF_EMPLOYEE_PREFIX}%`)

  const employeeIds = employees?.map((employee) => employee.id) ?? []
  if (employeeIds.length === 0) return

  await supabase.from('trips').delete().in('employee_id', employeeIds)
  await supabase.from('employees').delete().in('id', employeeIds)
}

/**
 * Seed a deterministic dataset so this guardrail measures real virtualization
 * work instead of silently skipping (or measuring an empty state) whenever the
 * environment has no ambient calendar data.
 */
async function seedPerfData(): Promise<boolean> {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) return false
  const adminStatus = getAdminConfigStatus()
  if (adminStatus.ok === false) return false

  const provisioned = await ensureTestUser({
    email,
    password,
    companyName: 'Playwright Calendar Perf Company',
  })
  if (!provisioned.ok || !provisioned.userId) return false

  const supabase = createAdminClientFromEnv()
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', provisioned.userId)
    .single()
  if (!profile?.company_id) return false

  await cleanupPerfSeedData()

  const employees = Array.from({ length: PERF_EMPLOYEE_COUNT }, (_, index) => ({
    company_id: profile.company_id,
    name: `${PERF_EMPLOYEE_PREFIX} ${String(index + 1).padStart(3, '0')}`,
    email: `perf-guardrail-${index + 1}@e2e.example.com`,
    nationality_type: 'uk_citizen',
  }))

  const { data: created, error } = await supabase
    .from('employees')
    .insert(employees)
    .select('id')
  if (error || !created) return false

  const countries = ['FR', 'DE', 'ES', 'IT', 'NL']
  const trips = created.flatMap((employee, employeeIndex) =>
    Array.from({ length: PERF_TRIPS_PER_EMPLOYEE }, (_, tripIndex) => {
      const start = -180 + tripIndex * 40 + (employeeIndex % 7)
      return {
        employee_id: employee.id,
        company_id: profile.company_id,
        country: countries[(employeeIndex + tripIndex) % countries.length],
        entry_date: isoDaysFromToday(start),
        exit_date: isoDaysFromToday(start + 5),
        is_private: false,
        ghosted: false,
      }
    })
  )

  const { error: tripError } = await supabase.from('trips').insert(trips)
  return !tripError
}

async function ensureCalendarAccess(page: Page): Promise<boolean> {
  await page.goto('/calendar')

  if (/\/calendar/.test(page.url())) {
    return true
  }

  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    return false
  }

  // Saved storage state can be missing or expired — sign in via the form.
  await page.goto('/login')
  const emailInput = page.getByLabel(/email/i)
  const hasLoginForm = await emailInput.isVisible({ timeout: 10000 }).catch(() => false)
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
  test.afterAll(async () => {
    await cleanupPerfSeedData()
  })

  test('timeline scroll stays within budget and emits metrics', async ({ page }) => {
    test.setTimeout(120000)

    const seeded = await seedPerfData()
    if (!seeded) {
      test.skip(true, 'Skipping: unable to seed calendar performance data.')
      return
    }

    const hasAccess = await ensureCalendarAccess(page)
    if (!hasAccess) {
      test.skip(true, 'Skipping: calendar is not accessible in this environment.')
      return
    }

    await page.waitForLoadState('networkidle')

    const timeline = page.getByTestId('calendar-timeline-viewport')
    await expect(timeline).toBeVisible({ timeout: 15000 })

    // Let hydration and the initial mount settle so the loop below measures
    // steady-state scrolling, not the tail of page load.
    await page.waitForTimeout(1000)

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
        // Not buffered: this guardrail budgets long tasks DURING the scroll
        // loop below. Buffered entries would also count page load/hydration,
        // which scales with dataset size and is covered by the mount metric.
        longTaskObserver.observe({ type: 'longtask' })
      }

      let last = performance.now()
      let maxFrameMs = 0
      let framesOver50Ms = 0
      const totalFrames = 210
      // Scroll during warmup too, but don't record those frames: the first
      // scrolled frames still absorb one-off work (JIT, style/layout cache,
      // GC after page load) that isn't representative of steady-state scroll.
      const warmupFrames = 30

      for (let frame = 0; frame < totalFrames; frame += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const now = performance.now()
        const delta = now - last
        last = now

        if (frame >= warmupFrames) {
          maxFrameMs = Math.max(maxFrameMs, delta)
          if (delta > 50) {
            framesOver50Ms += 1
          }
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

