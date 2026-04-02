'use client'

import { useEffect, useState } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'
import { COOKIEYES_CONSENT_EVENTS, hasAnalyticsConsent } from '@/lib/analytics/consent'

interface ConsentAwareGoogleAnalyticsProps {
  gaId: string
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

    for (const eventName of COOKIEYES_CONSENT_EVENTS) {
      window.addEventListener(eventName, syncConsent)
    }

    return () => {
      window.clearInterval(intervalId)
      for (const eventName of COOKIEYES_CONSENT_EVENTS) {
        window.removeEventListener(eventName, syncConsent)
      }
    }
  }, [])

  if (!hasConsent) {
    return null
  }

  return <GoogleAnalytics gaId={gaId} />
}
