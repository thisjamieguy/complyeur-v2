export const ANALYTICS_CONSENT_CATEGORY = 'analytics'

export const COOKIEYES_CONSENT_EVENTS = [
  'cookieyes_consent_update',
  'cookieyes_consent_accept',
  'cookieyes_consent_reject',
  'cookieyes_banner_close',
] as const

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.cookieyes?.hasConsent?.(ANALYTICS_CONSENT_CATEGORY) === true
}
