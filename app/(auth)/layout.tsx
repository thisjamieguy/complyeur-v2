import { Footer } from '@/components/layout/footer'
import { SkipLink } from '@/components/ui/skip-link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SkipLink />
      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 py-8"
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">ComplyEUR</h1>
            <p className="text-gray-600 mt-2">Schengen Compliance Management</p>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
