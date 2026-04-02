// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { trackEvent } from '@/lib/analytics/client'

describe('trackEvent', () => {
  let analyticsConsent = false
  let gtag: ReturnType<typeof vi.fn>

  beforeEach(() => {
    analyticsConsent = false
    gtag = vi.fn()

    window.cookieyes = {
      showSettingsPopup: vi.fn(),
      hasConsent: vi.fn((category: string) => category === 'analytics' && analyticsConsent),
      getConsent: vi.fn(() => ({ analytics: analyticsConsent })),
    }

    Object.assign(window, { gtag })
  })

  afterEach(() => {
    delete window.cookieyes
    delete (window as Window & { gtag?: typeof gtag }).gtag
  })

  it('does not send analytics events without consent', () => {
    trackEvent('sign_up', { method: 'email' })

    expect(gtag).not.toHaveBeenCalled()
  })

  it('does not send analytics events when gtag is unavailable', () => {
    analyticsConsent = true
    delete (window as Window & { gtag?: typeof gtag }).gtag

    expect(() => trackEvent('sign_up', { method: 'email' })).not.toThrow()
  })

  it('sends analytics events once consent is granted', () => {
    analyticsConsent = true

    trackEvent('sign_up', { method: 'email' })

    expect(gtag).toHaveBeenCalledWith('event', 'sign_up', { method: 'email' })
  })
})
