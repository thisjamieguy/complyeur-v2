import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCompanyAccess } from '@/lib/security/tenant-access'

const DEFAULT_ALLOWED_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export interface BillingSeatUsage {
  activeUsers: number
  pendingInvites: number
  limit: number
  available: number
}

export interface BillingEntitlementContext {
  companyId: string
  tierSlug: string | null
  subscriptionStatus: string | null
  seatUsage: BillingSeatUsage | null
}

export type BillingEnforcementResult =
  | {
      allowed: true
      context: BillingEntitlementContext
    }
  | {
      allowed: false
      response: NextResponse
    }

export interface BillingEnforcementOptions {
  allowedPlans?: string[]
  allowedStatuses?: string[]
  requiredAdditionalSeats?: number
  redirectToPortal?: boolean
}

interface RawSeatUsage {
  active_users?: number | null
  pending_invites?: number | null
  limit?: number | null
  available?: number | null
}

function normalizeSeatUsage(raw: RawSeatUsage | null | undefined): BillingSeatUsage | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  return {
    activeUsers: Number(raw.active_users ?? 0),
    pendingInvites: Number(raw.pending_invites ?? 0),
    limit: Number(raw.limit ?? 0),
    available: Number(raw.available ?? 0),
  }
}

function denyAccess(
  request: NextRequest,
  message: string,
  redirectToPortal: boolean
): BillingEnforcementResult {
  if (redirectToPortal) {
    const redirectUrl = new URL('/api/billing/portal', request.url)
    redirectUrl.searchParams.set('reason', 'entitlement_denied')
    return {
      allowed: false,
      response: NextResponse.redirect(redirectUrl, { status: 307 }),
    }
  }

  return {
    allowed: false,
    response: NextResponse.json({ error: message }, { status: 403 }),
  }
}

export async function enforceBillingEntitlements(
  request: NextRequest,
  options: BillingEnforcementOptions = {}
): Promise<BillingEnforcementResult> {
  const supabase = await createClient()
  const { companyId } = await requireCompanyAccess(supabase)

  const { data: entitlements, error } = await supabase
    .from('company_entitlements')
    .select('tier_slug, subscription_status')
    .eq('company_id', companyId)
    .single()

  if (error || !entitlements) {
    return denyAccess(
      request,
      'No billing entitlements found for this company.',
      options.redirectToPortal === true
    )
  }

  const allowedStatuses = new Set(
    options.allowedStatuses ?? Array.from(DEFAULT_ALLOWED_SUBSCRIPTION_STATUSES)
  )

  const subscriptionStatus = entitlements.subscription_status ?? 'none'
  if (!allowedStatuses.has(subscriptionStatus)) {
    return denyAccess(
      request,
      `Subscription is not active (status: ${subscriptionStatus}).`,
      options.redirectToPortal === true
    )
  }

  if (
    options.allowedPlans &&
    options.allowedPlans.length > 0 &&
    !options.allowedPlans.includes(entitlements.tier_slug ?? '')
  ) {
    return denyAccess(
      request,
      `Current plan '${entitlements.tier_slug ?? 'none'}' does not include this feature.`,
      options.redirectToPortal === true
    )
  }

  let seatUsage: BillingSeatUsage | null = null
  const requiredAdditionalSeats = Math.max(0, options.requiredAdditionalSeats ?? 0)

  if (requiredAdditionalSeats > 0) {
    const admin = createAdminClient()
    const { data: rawSeatUsage, error: seatError } = await admin.rpc(
      'get_company_seat_usage',
      {
        p_company_id: companyId,
      }
    )

    if (seatError) {
      return denyAccess(
        request,
        'Unable to validate plan seat limits.',
        options.redirectToPortal === true
      )
    }

    seatUsage = normalizeSeatUsage(rawSeatUsage as RawSeatUsage | null)
    if (!seatUsage) {
      return denyAccess(
        request,
        'Unable to validate plan seat limits.',
        options.redirectToPortal === true
      )
    }

    const currentlyUsedSeats = seatUsage.activeUsers + seatUsage.pendingInvites
    if (seatUsage.limit > 0 && currentlyUsedSeats + requiredAdditionalSeats > seatUsage.limit) {
      return denyAccess(
        request,
        `Seat limit reached (${currentlyUsedSeats}/${seatUsage.limit}).`,
        options.redirectToPortal === true
      )
    }
  }

  return {
    allowed: true,
    context: {
      companyId,
      tierSlug: entitlements.tier_slug,
      subscriptionStatus: entitlements.subscription_status,
      seatUsage,
    },
  }
}
