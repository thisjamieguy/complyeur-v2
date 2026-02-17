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
    const syncConsent = () => {
      setHasConsent(hasAnalyticsConsent())
    }

    // CookieYes is loaded asynchronously. Poll as a fallback and listen for updates.
    syncConsent()
    const intervalId = window.setInterval(syncConsent, 2000)

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
      window.clearInterval(intervalId)
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
