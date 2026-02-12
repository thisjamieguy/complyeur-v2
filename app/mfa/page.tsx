import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MfaEnrollmentPanel } from '@/components/mfa/mfa-enrollment'

export const dynamic = 'force-dynamic'

export default async function MfaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/" className="mb-5 inline-flex hover:opacity-85 transition-opacity">
          <Image
            src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
            alt="ComplyEur"
            width={170}
            height={45}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Multi-Factor Authentication</h1>
        <p className="text-slate-600 mt-1">
          Complete MFA setup or verification to continue.
        </p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <MfaEnrollmentPanel required />
      </div>
    </div>
  )
}
