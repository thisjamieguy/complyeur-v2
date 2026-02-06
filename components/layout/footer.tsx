'use client'

import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  const handleCookieSettings = () => {
    if (typeof window !== 'undefined' && window.cookieyes) {
      window.cookieyes.showSettingsPopup()
    }
  }

  return (
    <footer className="border-t border-brand-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-sm text-brand-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image
              src="/images/Icons/03_Icon_Only/ComplyEur_Icon.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
            />
            <span className="font-medium text-brand-700">ComplyEUR</span>
          </div>
          <p>&copy; {new Date().getFullYear()} ComplyEUR. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link
              href="/about"
              className="hover:text-brand-700 transition-colors"
            >
              About
            </Link>
            <Link
              href="/faq"
              className="hover:text-brand-700 transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/pricing"
              className="hover:text-brand-700 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="hover:text-brand-700 transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="hover:text-brand-700 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-brand-700 transition-colors"
            >
              Terms of Service
            </Link>
            <button
              type="button"
              onClick={handleCookieSettings}
              className="hover:text-brand-700 transition-colors"
            >
              Cookie Settings
            </button>
            <Link
              href="/accessibility"
              className="hover:text-brand-700 transition-colors"
            >
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
