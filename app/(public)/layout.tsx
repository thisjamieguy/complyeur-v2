import Link from 'next/link'
import { Footer } from '@/components/layout/footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Simple header with logo */}
      <header className="border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-xl font-semibold text-slate-900 hover:text-slate-700 transition-colors">
            ComplyEUR
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
