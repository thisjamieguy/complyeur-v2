import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const PAID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    const { data: entitlements, error: entitlementError } = await supabase
      .from('company_entitlements')
      .select('subscription_status, tier_slug, is_trial, trial_ends_at, updated_at')
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (entitlementError) {
      console.error('[billing/status] Failed to load entitlements:', entitlementError)
      return NextResponse.json(
        { error: 'Unable to load billing status right now.' },
        { status: 500 }
      )
    }

    const subscriptionStatus = entitlements?.subscription_status ?? null
    const isPaid = subscriptionStatus
      ? PAID_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
      : false

    return NextResponse.json(
      {
        subscriptionStatus,
        tierSlug: entitlements?.tier_slug ?? null,
        isTrial: entitlements?.is_trial ?? false,
        trialEndsAt: entitlements?.trial_ends_at ?? null,
        updatedAt: entitlements?.updated_at ?? null,
        isPaid,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('[billing/status] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unable to load billing status right now.' },
      { status: 500 }
    )
  }
}
