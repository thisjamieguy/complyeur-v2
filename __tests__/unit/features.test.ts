import { afterEach, describe, expect, it } from 'vitest'
import { isInteractiveCalendarEnabled, isSavedJobsEnabled } from '@/lib/features'

const originalSavedJobsFlag = process.env.FEATURE_SAVED_JOBS
const originalInteractiveCalendarFlag = process.env.ENABLE_INTERACTIVE_CALENDAR
const originalInteractiveCalendarAllowlist = process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS
const originalNodeEnv = process.env.NODE_ENV

describe('feature flags', () => {
  afterEach(() => {
    if (originalSavedJobsFlag === undefined) {
      delete process.env.FEATURE_SAVED_JOBS
    } else {
      process.env.FEATURE_SAVED_JOBS = originalSavedJobsFlag
    }

    if (originalInteractiveCalendarFlag === undefined) {
      delete process.env.ENABLE_INTERACTIVE_CALENDAR
    } else {
      process.env.ENABLE_INTERACTIVE_CALENDAR = originalInteractiveCalendarFlag
    }

    if (originalInteractiveCalendarAllowlist === undefined) {
      delete process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS
    } else {
      process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS = originalInteractiveCalendarAllowlist
    }

    process.env.NODE_ENV = originalNodeEnv
  })

  it('disables saved jobs by default', () => {
    delete process.env.FEATURE_SAVED_JOBS

    expect(isSavedJobsEnabled()).toBe(false)
  })

  it('enables saved jobs only when FEATURE_SAVED_JOBS is true', () => {
    process.env.FEATURE_SAVED_JOBS = 'false'
    expect(isSavedJobsEnabled()).toBe(false)

    process.env.FEATURE_SAVED_JOBS = 'TRUE'
    expect(isSavedJobsEnabled()).toBe(false)

    process.env.FEATURE_SAVED_JOBS = 'true'
    expect(isSavedJobsEnabled()).toBe(true)
  })

  it('enables the interactive calendar globally only when ENABLE_INTERACTIVE_CALENDAR is true', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS

    process.env.ENABLE_INTERACTIVE_CALENDAR = 'false'
    expect(isInteractiveCalendarEnabled('jamie.guy@me.com')).toBe(false)

    process.env.ENABLE_INTERACTIVE_CALENDAR = 'TRUE'
    expect(isInteractiveCalendarEnabled('jamie.guy@me.com')).toBe(false)

    process.env.ENABLE_INTERACTIVE_CALENDAR = 'true'
    expect(isInteractiveCalendarEnabled('someone@example.com')).toBe(true)
  })

  it('uses the admin-managed global interactive calendar setting when provided', () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_INTERACTIVE_CALENDAR = 'true'
    delete process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS

    expect(
      isInteractiveCalendarEnabled('someone@example.com', {
        globalEnabled: false,
      })
    ).toBe(false)

    expect(
      isInteractiveCalendarEnabled('someone@example.com', {
        globalEnabled: true,
      })
    ).toBe(true)
  })

  it('enables the interactive calendar for allowlisted account emails', () => {
    process.env.NODE_ENV = 'production'
    process.env.ENABLE_INTERACTIVE_CALENDAR = 'false'
    process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS =
      'ops@example.com, Jamie.Guy@me.com; manager@example.com'

    expect(isInteractiveCalendarEnabled('jamie.guy@me.com')).toBe(true)
    expect(isInteractiveCalendarEnabled('JAMIE.GUY@ME.COM')).toBe(true)
    expect(isInteractiveCalendarEnabled('someone@example.com')).toBe(false)
    expect(isInteractiveCalendarEnabled(null)).toBe(false)
  })

  it('keeps the interactive calendar disabled by default in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.ENABLE_INTERACTIVE_CALENDAR
    delete process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS

    expect(isInteractiveCalendarEnabled('jamie.guy@me.com')).toBe(false)
  })
})
