/**
 * CookieYes TypeScript type declarations
 *
 * CookieYes is a cookie consent management platform that helps with GDPR,
 * UK GDPR, and CCPA compliance.
 */

declare global {
  interface Window {
    cookieyes?: {
      /**
       * Opens the cookie preferences popup where users can manage their consent
       */
      showSettingsPopup: () => void

      /**
       * Checks if the user has given consent for a specific cookie category
       * @param category - The cookie category to check ('necessary', 'analytics', 'marketing', etc.)
       * @returns Whether the user has consented to the category
       */
      hasConsent: (category: string) => boolean

      /**
       * Gets the current consent status for all categories
       * @returns Object with category names as keys and consent status as values
       */
      getConsent?: () => Record<string, boolean>
    }
  }
}

/**
 * Cookie categories used in ComplyEUR
 */
export type CookieCategory = 'necessary' | 'analytics' | 'marketing'

/**
 * Helper function to safely check if CookieYes is available
 */
export function isCookieYesAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.cookieyes
}

/**
 * Helper function to safely show the CookieYes settings popup
 */
export function showCookieSettings(): void {
  if (isCookieYesAvailable()) {
    window.cookieyes!.showSettingsPopup()
  }
}

/**
 * Helper function to safely check consent for a category
 */
export function hasConsentFor(category: CookieCategory): boolean {
  if (isCookieYesAvailable()) {
    const cookieyes = window.cookieyes!
    if (typeof cookieyes.hasConsent === 'function') {
      return cookieyes.hasConsent(category)
    }
  }
  // If CookieYes is not available, only allow necessary cookies
  return category === 'necessary'
}

export {}
