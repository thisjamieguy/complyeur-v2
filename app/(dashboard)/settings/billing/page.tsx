import { SettingsSectionHeader } from '@/components/settings/settings-section-header'
import { BillingSection } from '@/components/settings/billing-section'
import { getCompanyEntitlements } from '@/lib/billing/entitlements'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Billing',
  description: 'View your plan, trial status, and manage your subscription',
}

export default async function BillingSettingsPage() {
  const { companyId } = await requireCompanyAccessCached()

  const [entitlements, companyResult] = await Promise.all([
    getCompanyEntitlements(),
    createClient().then((s) =>
      s.from('companies').select('stripe_customer_id').eq('id', companyId).single()
    ),
  ])

  const hasStripeCustomer = !!companyResult.data?.stripe_customer_id

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        eyebrow="Organisation"
        title="Plan & billing"
        description="Review your current plan and trial, and manage payment details and invoices."
      />

      <BillingSection
        tierSlug={entitlements?.tier_slug ?? null}
        isTrial={entitlements?.is_trial ?? false}
        trialEndsAt={entitlements?.trial_ends_at ?? null}
        subscriptionStatus={entitlements?.subscription_status ?? null}
        hasStripeCustomer={hasStripeCustomer}
      />
    </div>
  )
}
