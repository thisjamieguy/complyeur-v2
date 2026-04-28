import { afterEach, describe, expect, it } from 'vitest'
import { isSavedJobsEnabled } from '@/lib/features'

const originalSavedJobsFlag = process.env.FEATURE_SAVED_JOBS

describe('feature flags', () => {
  afterEach(() => {
    if (originalSavedJobsFlag === undefined) {
      delete process.env.FEATURE_SAVED_JOBS
    } else {
      process.env.FEATURE_SAVED_JOBS = originalSavedJobsFlag
    }
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
})
