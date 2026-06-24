import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendTrialExpiringEmail,
  sendUpcomingRenewalEmail,
} from '@/lib/services/email-service'
import { withCronAuth } from '@/lib/security/cron-auth'
import { getPlanBySlug } from '@/lib/billing/plans'
import { getStripe } from '@/lib/billing/stripe'
import { logger } from '@/lib/logger.mjs'

interface BillingTierSnapshot {
  slug: string
  max_employees: number | null
  max_users: number | null
  can_export_csv: boolean | null
  can_export_pdf: boolean | null
  can_forecast: boolean | null
  can_calendar: boolean | null
  can_bulk_import: boolean | null
  can_api_access: boolean | null
  can_sso: boolean | null
  can_audit_logs: boolean | null
}

function formatBillingAmount(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  if (amountMinor === null || amountMinor === undefined || !currency) {
    return 'your subscription fee'
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}

export function buildExpiredTrialDowngradeUpdates(freeTier: BillingTierSnapshot): Record<string, unknown> {
  return {
    tier_slug: freeTier.slug,
    is_trial: false,
    trial_ends_at: null,
    subscription_status: 'none',
    current_period_end: null,
    max_employees: freeTier.max_employees,
    max_users: freeTier.max_users,
    can_export_csv: freeTier.can_export_csv,
    can_export_pdf: freeTier.can_export_pdf,
    can_forecast: freeTier.can_forecast,
    can_calendar: freeTier.can_calendar,
    can_bulk_import: freeTier.can_bulk_import,
    can_api_access: freeTier.can_api_access,
    can_sso: freeTier.can_sso,
    can_audit_logs: freeTier.can_audit_logs,
    updated_at: new Date().toISOString(),
  }
}

export async function resolveRenewalAmountDue(params: {
  stripeSubscriptionId: string | null
  tierSlug: string | null
}): Promise<string> {
  const plan = getPlanBySlug(params.tierSlug)
  const fallbackAmount = plan
    ? formatBillingAmount(plan.monthlyPriceGbp * 100, 'gbp')
    : 'your subscription fee'

  if (!params.stripeSubscriptionId) {
    return fallbackAmount
  }

  try {
    const invoicePreview = await getStripe().invoices.createPreview({
      subscription: params.stripeSubscriptionId,
    })

    return formatBillingAmount(invoicePreview.amount_due, invoicePreview.currency)
  } catch (error) {
    logger.error('[Billing Cron] Failed to preview Stripe renewal invoice', {
      stripeSubscriptionId: params.stripeSubscriptionId,
      error,
    })
    return fallbackAmount
  }
}

/**
 * Billing Email Sequence Cron
 *
 * Runs daily and handles billing lifecycle work:
 *
 *   Trial expiry — downgrades expired app-created trials to the free tier
 *
 *   Trial expiring — 3 days before trial_ends_at
 *     Targets: is_trial = true, trial ends within 3 days, not already sent
 *
 *   Upcoming renewal — 7 days before current_period_end
 *     Targets: active subscription, renewal within 7 days, not already sent for this period
 *
 * Sends are tracked in `billing_email_log` to prevent duplicates on retries.
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/billing",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
async function handleBillingCron(): Promise<NextResponse> {
  logger.info('[Billing Cron] Starting billing email run')

  const admin = createAdminClient()
  const now = new Date()

  const results = {
    trialExpired: { downgraded: 0, skipped: 0, errors: 0 },
    trialExpiring: { sent: 0, skipped: 0, errors: 0 },
    upcomingRenewal: { sent: 0, skipped: 0, errors: 0 },
  }

  // -------------------------------------------------------------------------
  // Trial expiry: app-created trials should not retain paid-tier access after
  // trial_ends_at if no Stripe subscription has replaced them.
  // -------------------------------------------------------------------------
  const { data: freeTier, error: freeTierError } = await admin
    .from('tiers')
    .select('*')
    .eq('slug', 'free')
    .maybeSingle<BillingTierSnapshot>()

  if (freeTierError || !freeTier) {
    logger.error('[Billing Cron] Failed to load free tier for trial expiry', {
      error: freeTierError,
    })
    return NextResponse.json({ success: false, error: 'Failed to process trial expiry' }, { status: 500 })
  }

  const { data: expiredTrialCandidates, error: expiredTrialError } = await admin
    .from('company_entitlements')
    .select('company_id, trial_ends_at')
    .eq('is_trial', true)
    .eq('subscription_status', 'trialing')
    .is('stripe_subscription_id', null)
    .lte('trial_ends_at', now.toISOString())

  if (expiredTrialError) {
    logger.error('[Billing Cron] Failed to query expired trial candidates', {
      error: expiredTrialError,
    })
    return NextResponse.json({ success: false, error: 'Failed to process trial expiry' }, { status: 500 })
  }

  const expiredTrialDowngradeUpdates = buildExpiredTrialDowngradeUpdates(freeTier)

  for (const entitlement of expiredTrialCandidates ?? []) {
    const { error: downgradeError } = await admin
      .from('company_entitlements')
      .update(expiredTrialDowngradeUpdates)
      .eq('company_id', entitlement.company_id)
      .eq('is_trial', true)
      .eq('subscription_status', 'trialing')
      .is('stripe_subscription_id', null)

    if (downgradeError) {
      results.trialExpired.errors++
      logger.error('[Billing Cron] Failed to downgrade expired trial', {
        companyId: entitlement.company_id,
        error: downgradeError,
      })
      continue
    }

    results.trialExpired.downgraded++
    logger.info('[Billing Cron] Expired trial downgraded', {
      companyId: entitlement.company_id,
      trialEndsAt: entitlement.trial_ends_at,
    })
  }

  // -------------------------------------------------------------------------
  // Trial expiring: trial ends within 3 days, not already sent
  // -------------------------------------------------------------------------
  const trialWindowEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: trialCandidates, error: trialError } = await admin
    .from('company_entitlements')
    .select('company_id, trial_ends_at')
    .eq('is_trial', true)
    .lte('trial_ends_at', trialWindowEnd)
    .gte('trial_ends_at', now.toISOString()) // not already expired

  if (trialError) {
    logger.error('[Billing Cron] Failed to query trial candidates', { error: trialError })
    return NextResponse.json({ success: false, error: 'Failed to process trial expiry emails' }, { status: 500 })
  }

  for (const entitlement of trialCandidates ?? []) {
    const { data: alreadySent } = await admin
      .from('billing_email_log')
      .select('id')
      .eq('company_id', entitlement.company_id)
      .eq('email_type', 'trial_expiring')
      .eq('reference_key', 'once')
      .maybeSingle()

    if (alreadySent) {
      results.trialExpiring.skipped++
      continue
    }

    const { data: company } = await admin
      .from('companies')
      .select('name, email')
      .eq('id', entitlement.company_id)
      .maybeSingle()

    if (!company?.email) {
      results.trialExpiring.skipped++
      continue
    }

    const trialEndsAt = new Date(entitlement.trial_ends_at!)
    const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const emailResult = await sendTrialExpiringEmail({
      recipientEmail: company.email,
      companyName: company.name ?? undefined,
      trialEndsAt,
      daysRemaining,
    })

    if (emailResult.success) {
      await admin.from('billing_email_log').insert({
        company_id: entitlement.company_id,
        email_type: 'trial_expiring',
        reference_key: 'once',
      })
      results.trialExpiring.sent++
      logger.info('[Billing Cron] Trial expiring email sent', { companyId: entitlement.company_id, daysRemaining })
    } else {
      results.trialExpiring.errors++
      logger.error('[Billing Cron] Trial expiring email failed', {
        companyId: entitlement.company_id,
        error: emailResult.error,
      })
    }
  }

  // -------------------------------------------------------------------------
  // Upcoming renewal: renews within 7 days, not already sent for this period
  // -------------------------------------------------------------------------
  const renewalWindowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: renewalCandidates, error: renewalError } = await admin
    .from('company_entitlements')
    .select('company_id, tier_slug, current_period_end, stripe_subscription_id')
    .eq('subscription_status', 'active')
    .eq('is_trial', false)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', renewalWindowEnd)
    .gte('current_period_end', now.toISOString()) // not already past

  if (renewalError) {
    logger.error('[Billing Cron] Failed to query renewal candidates', { error: renewalError })
    return NextResponse.json({ success: false, error: 'Failed to process renewal emails' }, { status: 500 })
  }

  for (const entitlement of renewalCandidates ?? []) {
    const renewsAt = new Date(entitlement.current_period_end!)
    // Use the renewal date (day only) as the deduplication key — one email per renewal period
    const referenceKey = renewsAt.toISOString().slice(0, 10)

    const { data: alreadySent } = await admin
      .from('billing_email_log')
      .select('id')
      .eq('company_id', entitlement.company_id)
      .eq('email_type', 'upcoming_renewal')
      .eq('reference_key', referenceKey)
      .maybeSingle()

    if (alreadySent) {
      results.upcomingRenewal.skipped++
      continue
    }

    const { data: company } = await admin
      .from('companies')
      .select('name, email')
      .eq('id', entitlement.company_id)
      .maybeSingle()

    if (!company?.email) {
      results.upcomingRenewal.skipped++
      continue
    }

    const plan = getPlanBySlug(entitlement.tier_slug)
    const planName = plan?.publicName ?? entitlement.tier_slug ?? 'your plan'
    const amountDue = await resolveRenewalAmountDue({
      stripeSubscriptionId: entitlement.stripe_subscription_id,
      tierSlug: entitlement.tier_slug,
    })

    const emailResult = await sendUpcomingRenewalEmail({
      recipientEmail: company.email,
      companyName: company.name ?? undefined,
      planName,
      amountDue,
      renewsAt,
    })

    if (emailResult.success) {
      await admin.from('billing_email_log').insert({
        company_id: entitlement.company_id,
        email_type: 'upcoming_renewal',
        reference_key: referenceKey,
      })
      results.upcomingRenewal.sent++
      logger.info('[Billing Cron] Upcoming renewal email sent', { companyId: entitlement.company_id, renewalDate: referenceKey })
    } else {
      results.upcomingRenewal.errors++
      logger.error('[Billing Cron] Upcoming renewal email failed', {
        companyId: entitlement.company_id,
        error: emailResult.error,
      })
    }
  }

  logger.info('[Billing Cron] Run complete', { results })

  return NextResponse.json({ success: true, results })
}

export const GET = withCronAuth(handleBillingCron)
export const POST = withCronAuth(handleBillingCron)
