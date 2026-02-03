'use client'

import Link from 'next/link'

export function Footer() {
  const handleCookieSettings = () => {
    if (typeof window !== 'undefined' && window.cookieyes) {
      window.cookieyes.showSettingsPopup()
    }
  }

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} ComplyEUR. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link
              href="/about"
              className="hover:text-slate-700 transition-colors"
            >
              About
            </Link>
            <Link
              href="/faq"
              className="hover:text-slate-700 transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              className="hover:text-slate-700 transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="hover:text-slate-700 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-slate-700 transition-colors"
            >
              Terms of Service
            </Link>
            <button
              type="button"
              onClick={handleCookieSettings}
              className="hover:text-slate-700 transition-colors"
            >
              Cookie Settings
            </button>
            <Link
              href="/accessibility"
              className="hover:text-slate-700 transition-colors"
            >
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
