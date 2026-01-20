import { redirect } from 'next/navigation'
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
