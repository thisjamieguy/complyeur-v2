import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BillingOnboardingFlow } from '@/components/onboarding/billing-onboarding-flow'

interface OnboardingPageProps {
  searchParams: Promise<{ checkout?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
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

  if (profile.onboarding_completed_at) {
    redirect('/dashboard')
  }

  if (!profile.company_id) {
    redirect('/login')
  }

  const params = await searchParams
  const checkoutState =
    params.checkout === 'success' || params.checkout === 'cancelled'
      ? params.checkout
      : null

  // Fetch current company details and billing status
  let companyName = 'My Company'
  const [{ data: company }, { data: entitlements }] = await Promise.all([
    supabase
      .from('companies')
      .select('name')
      .eq('id', profile.company_id)
      .maybeSingle(),
    supabase
      .from('company_entitlements')
      .select('subscription_status, tier_slug')
      .eq('company_id', profile.company_id)
      .maybeSingle(),
  ])

  if (company?.name) {
    companyName = company.name
  }

  return (
    <BillingOnboardingFlow
      initialCompanyName={companyName}
      initialSubscriptionStatus={entitlements?.subscription_status ?? null}
      initialTierSlug={entitlements?.tier_slug ?? null}
      checkoutState={checkoutState}
    />
  )
}
