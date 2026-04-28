'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { COOKIEYES_CONSENT_EVENTS, hasAnalyticsConsent } from '@/lib/analytics/consent'

interface ConsentAwareMicrosoftClarityProps {
  clarityId: string
}

export function ConsentAwareMicrosoftClarity({
  clarityId,
}: ConsentAwareMicrosoftClarityProps) {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    const syncConsent = () => {
      setHasConsent(hasAnalyticsConsent())
    }

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

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","${clarityId}");`,
      }}
    />
  )
}
