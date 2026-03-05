'use client'

import { useEffect, useState } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'

interface ConsentAwareGoogleAnalyticsProps {
  gaId: string
}

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.cookieyes?.hasConsent?.('analytics') === true
}

export function ConsentAwareGoogleAnalytics({
  gaId,
}: ConsentAwareGoogleAnalyticsProps) {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    let isDisposed = false
    let retryCount = 0
    let retryTimeoutId: number | undefined

    const syncConsent = () => {
      if (isDisposed) {
        return
      }
      setHasConsent(hasAnalyticsConsent())
    }

    // CookieYes is loaded asynchronously. Do a bounded retry instead of perpetual polling.
    syncConsent()
    const scheduleRetry = () => {
      if (window.cookieyes || retryCount >= 5) {
        return
      }

      retryTimeoutId = window.setTimeout(() => {
        retryCount += 1
        syncConsent()
        scheduleRetry()
      }, 1000)
    }
    scheduleRetry()

    const consentEvents = [
      'cookieyes_consent_update',
      'cookieyes_consent_accept',
      'cookieyes_consent_reject',
      'cookieyes_banner_close',
    ]

    for (const eventName of consentEvents) {
      window.addEventListener(eventName, syncConsent)
    }

    return () => {
      isDisposed = true
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId)
      }
      for (const eventName of consentEvents) {
        window.removeEventListener(eventName, syncConsent)
      }
    }
  }, [])

  if (!hasConsent) {
    return null
  }

  return <GoogleAnalytics gaId={gaId} />
}
