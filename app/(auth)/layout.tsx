import Image from 'next/image'
import { Footer } from '@/components/layout/footer'
import { SkipLink } from '@/components/ui/skip-link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="landing-shell relative min-h-screen flex flex-col overflow-hidden bg-[color:var(--landing-surface)]">
      <SkipLink />
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-aurora-top absolute -top-28 left-[-7rem] h-[24rem] w-[24rem] rounded-full" />
        <div className="landing-aurora-bottom absolute right-[-7rem] top-[18rem] h-[22rem] w-[22rem] rounded-full" />
        <div className="landing-grid absolute inset-0" />
      </div>
      <main
        id="main-content"
        className="relative z-10 flex-1 flex items-center justify-center px-4 py-10"
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/images/Icons/02_Logo_Stacked/ComplyEur_Logo_Stacked.svg"
              alt="ComplyEur"
              width={180}
              height={100}
              className="mx-auto mb-4 drop-shadow-sm"
              priority
            />
            <p className="text-slate-600">Schengen Compliance Management</p>
          </div>
          {children}
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
}
