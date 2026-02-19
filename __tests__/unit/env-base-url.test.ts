import { afterEach, describe, expect, it } from 'vitest'
import { getBaseUrl } from '@/lib/env'

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
const originalVercelUrl = process.env.VERCEL_URL

describe('getBaseUrl', () => {
  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    }

    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_URL
    } else {
      process.env.VERCEL_URL = originalVercelUrl
    }
  })

  it('uses canonical NEXT_PUBLIC_APP_URL and ignores forwarded host headers', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.com///'
    process.env.VERCEL_URL = 'preview-evil.vercel.app'
    const requestHeaders = new Headers({
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'http',
      host: 'attacker.example',
    })

    expect(getBaseUrl(requestHeaders)).toBe('https://app.com')
  })

  it('falls back to VERCEL_URL when NEXT_PUBLIC_APP_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.VERCEL_URL = 'complyeur-preview.vercel.app'

    expect(getBaseUrl()).toBe('https://complyeur-preview.vercel.app')
  })

  it('falls back to localhost when neither NEXT_PUBLIC_APP_URL nor VERCEL_URL is set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.VERCEL_URL

    expect(getBaseUrl()).toBe('http://localhost:3000')
  })
})
