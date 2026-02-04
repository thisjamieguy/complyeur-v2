import Image from 'next/image'
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
            <Image
              src="/images/Icons/02_Logo_Stacked/ComplyEur_Logo_Stacked.svg"
              alt="ComplyEUR"
              width={180}
              height={100}
              className="mx-auto mb-4"
              priority
            />
            <p className="text-gray-600">Schengen Compliance Management</p>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
