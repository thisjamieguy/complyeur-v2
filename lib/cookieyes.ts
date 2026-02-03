/**
 * CookieYes TypeScript type declarations
 *
 * CookieYes is a cookie consent management platform that helps with GDPR,
 * UK GDPR, and CCPA compliance.
 *
 * This file provides global type declarations for the window.cookieyes object
 * which is loaded via script tag in app/layout.tsx.
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

export {}
