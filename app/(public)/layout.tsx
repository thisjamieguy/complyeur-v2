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
      {/* Simple header with logo */}
      <header className="border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <Image
              src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
              alt="ComplyEUR"
              width={150}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
