import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_REQUEST_BODY_BYTES,
  formatMaxRequestBodyError,
  getMaxRequestBodyBytesForPath,
  IMPORT_MAX_REQUEST_BODY_BYTES,
} from '@/lib/constants/request-limits'

describe('request-limits constants', () => {
  it('uses import-specific body cap for import paths', () => {
    expect(getMaxRequestBodyBytesForPath('/import')).toBe(IMPORT_MAX_REQUEST_BODY_BYTES)
    expect(getMaxRequestBodyBytesForPath('/import/history')).toBe(IMPORT_MAX_REQUEST_BODY_BYTES)
  })

  it('uses default cap for non-import paths', () => {
    expect(getMaxRequestBodyBytesForPath('/api/health')).toBe(DEFAULT_MAX_REQUEST_BODY_BYTES)
    expect(getMaxRequestBodyBytesForPath('/dashboard')).toBe(DEFAULT_MAX_REQUEST_BODY_BYTES)
  })

  it('formats error message in MB', () => {
    expect(formatMaxRequestBodyError(DEFAULT_MAX_REQUEST_BODY_BYTES)).toBe(
      'Request body too large. Maximum size is 1MB.'
    )
    expect(formatMaxRequestBodyError(IMPORT_MAX_REQUEST_BODY_BYTES)).toBe(
      'Request body too large. Maximum size is 10MB.'
    )
  })
})
