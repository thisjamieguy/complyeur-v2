import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing/stripe'
import { PERMISSIONS } from '@/lib/permissions'
import { requireMutationPermission } from '@/lib/security/authorization'

export const runtime = 'nodejs'

/**
 * Create a Stripe Customer Portal session.
 * Allows users to manage their subscription, update payment method, view invoices.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const guard = await requireMutationPermission(
      supabase,
      PERMISSIONS.BILLING_MANAGE,
      'billingPortal'
    )
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', guard.companyId)
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
      return_url: new URL('/settings/billing', request.url).toString(),
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
