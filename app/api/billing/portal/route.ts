import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing/stripe'

export const runtime = 'nodejs'

/**
 * Create a Stripe Customer Portal session.
 * Allows users to manage their subscription, update payment method, view invoices.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the user's company and stripe_customer_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', profile.company_id)
      .single()

    if (!company?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: new URL('/settings?section=general', request.url).toString(),
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('[billing/portal] Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Unable to open billing portal. Please try again.' },
      { status: 500 }
    )
  }
}
