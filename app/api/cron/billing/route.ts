import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendTrialExpiringEmail,
  sendUpcomingRenewalEmail,
} from '@/lib/services/email-service'
import { withCronAuth } from '@/lib/security/cron-auth'
import { getPlanBySlug } from '@/lib/billing/plans'
import { logger } from '@/lib/logger.mjs'

/**
 * Billing Email Sequence Cron
 *
 * Runs daily and sends two billing lifecycle emails:
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
    trialExpiring: { sent: 0, skipped: 0, errors: 0 },
    upcomingRenewal: { sent: 0, skipped: 0, errors: 0 },
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
    return NextResponse.json({ success: false, error: trialError.message }, { status: 500 })
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
    .select('company_id, tier_slug, current_period_end')
    .eq('subscription_status', 'active')
    .eq('is_trial', false)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', renewalWindowEnd)
    .gte('current_period_end', now.toISOString()) // not already past

  if (renewalError) {
    logger.error('[Billing Cron] Failed to query renewal candidates', { error: renewalError })
    return NextResponse.json({ success: false, error: renewalError.message }, { status: 500 })
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
    // Use monthly price as a fallback — in practice this should come from Stripe
    const amountDue = plan
      ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(plan.monthlyPriceGbp)
      : 'your subscription fee'

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
