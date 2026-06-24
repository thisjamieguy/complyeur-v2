import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  if (!profile.company_id) {
    redirect('/login')
  }

  redirect('/dashboard')
}
