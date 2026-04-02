'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const mobileNavLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '/landing/preview', label: 'Preview' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
]

export function LandingMobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed left-4 right-4 top-20 z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 lg:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t border-slate-100" />
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="#early-access"
                onClick={() => setIsOpen(false)}
                className="mt-1 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Request Early Access
              </Link>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
