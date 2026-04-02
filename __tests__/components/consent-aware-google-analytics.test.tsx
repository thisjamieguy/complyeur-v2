// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConsentAwareGoogleAnalytics } from '@/components/analytics/consent-aware-google-analytics'

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-ga-id={gaId} data-testid="google-analytics" />
  ),
}))

describe('ConsentAwareGoogleAnalytics', () => {
  let analyticsConsent = false

  beforeEach(() => {
    analyticsConsent = false

    window.cookieyes = {
      showSettingsPopup: vi.fn(),
      hasConsent: vi.fn((category: string) => category === 'analytics' && analyticsConsent),
      getConsent: vi.fn(() => ({ analytics: analyticsConsent })),
    }
  })

  afterEach(() => {
    delete window.cookieyes
  })

  it('does not render Google Analytics before analytics consent is granted', () => {
    render(<ConsentAwareGoogleAnalytics gaId="G-TEST123" />)

    expect(screen.queryByTestId('google-analytics')).not.toBeInTheDocument()
  })

  it('renders Google Analytics immediately when analytics consent already exists', async () => {
    analyticsConsent = true

    render(<ConsentAwareGoogleAnalytics gaId="G-TEST123" />)

    await waitFor(() => {
      expect(screen.getByTestId('google-analytics')).toHaveAttribute('data-ga-id', 'G-TEST123')
    })
  })

  it('starts Google Analytics after CookieYes emits a consent update event', async () => {
    render(<ConsentAwareGoogleAnalytics gaId="G-TEST123" />)

    expect(screen.queryByTestId('google-analytics')).not.toBeInTheDocument()

    analyticsConsent = true

    await act(async () => {
      window.dispatchEvent(new Event('cookieyes_consent_update'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('google-analytics')).toBeInTheDocument()
    })
  })

  it('picks up consent if CookieYes becomes ready after initial render', async () => {
    vi.useFakeTimers()
    render(<ConsentAwareGoogleAnalytics gaId="G-TEST123" />)

    analyticsConsent = true

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByTestId('google-analytics')).toBeInTheDocument()

    vi.useRealTimers()
  })
})
