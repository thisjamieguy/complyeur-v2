type AnalyticsParams = Record<string, string | number | boolean | null | undefined>

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.cookieyes?.hasConsent?.('analytics') === true
}

function getGtag(): ((...args: unknown[]) => void) | null {
  if (typeof window === 'undefined') {
    return null
  }

  const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag
  return typeof gtag === 'function' ? gtag : null
}

export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (!hasAnalyticsConsent()) {
    return
  }

  const gtag = getGtag()
  if (!gtag) {
    return
  }

  gtag('event', name, params ?? {})
}
