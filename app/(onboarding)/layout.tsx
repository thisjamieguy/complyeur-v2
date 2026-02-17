import Image from 'next/image'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-8 text-center">
          <Image
            src="/images/Icons/02_Logo_Stacked/ComplyEur_Logo_Stacked.svg"
            alt="ComplyEur"
            width={160}
            height={90}
            className="mx-auto mb-2 drop-shadow-sm"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  )
}
