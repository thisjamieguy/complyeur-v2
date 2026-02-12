import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/components/layout/footer'
import { SkipLink } from '@/components/ui/skip-link'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <Link href="/landing" className="inline-block hover:opacity-80 transition-opacity">
              <Image
                src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
                alt="ComplyEur"
                width={150}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/landing"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Join Waitlist
              </Link>
            </div>
          </div>
          <nav aria-label="Public pages" className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link href="/pricing" className="font-medium text-slate-600 transition hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/about" className="font-medium text-slate-600 transition hover:text-slate-900">
              About
            </Link>
            <Link href="/faq" className="font-medium text-slate-600 transition hover:text-slate-900">
              FAQ
            </Link>
            <Link href="/contact" className="font-medium text-slate-600 transition hover:text-slate-900">
              Contact
            </Link>
            <Link href="/privacy" className="font-medium text-slate-600 transition hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="font-medium text-slate-600 transition hover:text-slate-900">
              Terms
            </Link>
            <Link href="/accessibility" className="font-medium text-slate-600 transition hover:text-slate-900">
              Accessibility
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  )
}
