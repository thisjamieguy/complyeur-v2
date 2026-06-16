import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOperationalAlertEmail } from '@/lib/services/email-service'
import { withCronAuth } from '@/lib/security/cron-auth'
import { logger } from '@/lib/logger.mjs'

const DEFAULT_ZERO_SIGNUP_WINDOW_HOURS = 24
const MIN_ZERO_SIGNUP_WINDOW_HOURS = 1
const MAX_ZERO_SIGNUP_WINDOW_HOURS = 168
const WEBHOOK_STALE_PROCESSING_MINUTES = 10

function getZeroSignupWindowHours(): number {
  const raw = process.env.ZERO_SIGNUP_ALERT_WINDOW_HOURS
  if (!raw) return DEFAULT_ZERO_SIGNUP_WINDOW_HOURS

  const parsed = Number.parseInt(raw, 10)
  if (
    Number.isNaN(parsed) ||
    parsed < MIN_ZERO_SIGNUP_WINDOW_HOURS ||
    parsed > MAX_ZERO_SIGNUP_WINDOW_HOURS
  ) {
    return DEFAULT_ZERO_SIGNUP_WINDOW_HOURS
  }

  return parsed
}

function getOperationalRecipientEmail(): string {
  return process.env.ZERO_SIGNUP_ALERT_RECIPIENT ??
    process.env.EMAIL_REPLY_TO ??
    'support@complyeur.com'
}

async function handleBetaMonitoringCron(): Promise<NextResponse> {
  logger.info('[Beta Monitoring Cron] Starting public beta monitoring run')

  const admin = createAdminClient()
  const windowHours = getZeroSignupWindowHours()
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)
  const sinceIso = since.toISOString()
  const staleWebhookBeforeIso = new Date(
    Date.now() - WEBHOOK_STALE_PROCESSING_MINUTES * 60 * 1000
  ).toISOString()

  const [companiesResult, usersResult, failedWebhookResult, staleWebhookResult] = await Promise.all([
    admin
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sinceIso),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sinceIso),
    admin
      .from('stripe_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('processing_status', 'failed')
      .gte('updated_at', sinceIso),
    admin
      .from('stripe_webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('processing_status', 'processing')
      .lt('processing_started_at', staleWebhookBeforeIso),
  ])

  if (
    companiesResult.error ||
    usersResult.error ||
    failedWebhookResult.error ||
    staleWebhookResult.error
  ) {
    logger.error('[Beta Monitoring Cron] Failed to query monitoring inputs', {
      companiesError: companiesResult.error,
      usersError: usersResult.error,
      failedWebhookError: failedWebhookResult.error,
      staleWebhookError: staleWebhookResult.error,
    })

    return NextResponse.json(
      { success: false, error: 'Failed to query beta monitoring inputs' },
      { status: 500 }
    )
  }

  const companiesCreated = companiesResult.count ?? 0
  const usersCreated = usersResult.count ?? 0
  const failedWebhooks = failedWebhookResult.count ?? 0
  const staleProcessingWebhooks = staleWebhookResult.count ?? 0
  const shouldSendZeroSignupAlert = companiesCreated === 0
  const shouldSendWebhookAlert = failedWebhooks > 0 || staleProcessingWebhooks > 0
  let zeroSignupAlertSent = false
  let webhookAlertSent = false

  if (shouldSendZeroSignupAlert) {
    const recipientEmail = getOperationalRecipientEmail()
    const result = await sendOperationalAlertEmail({
      recipientEmail,
      subject: `[ComplyEur beta] No new signups in the last ${windowHours} hours`,
      heading: 'No new public beta signups detected',
      severity: 'warning',
      body: [
        `No companies were created between ${sinceIso} and ${new Date().toISOString()}.`,
        `User profiles created in the same window: ${usersCreated}.`,
        'Check acquisition, signup email delivery, Vercel/Supabase health, analytics consent reporting, and recent Sentry/auth errors before treating this as only a demand signal.',
      ],
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://complyeur.com'}/admin/metrics`,
      actionLabel: 'Open metrics',
      tags: [
        { name: 'category', value: 'operations' },
        { name: 'monitor', value: 'zero-signup' },
      ],
    })

    zeroSignupAlertSent = result.success

    if (!result.success) {
      logger.error('[Beta Monitoring Cron] Zero-signup alert email failed', {
        error: result.error,
      })
    }
  }

  if (shouldSendWebhookAlert) {
    const recipientEmail = getOperationalRecipientEmail()
    const result = await sendOperationalAlertEmail({
      recipientEmail,
      subject: '[ComplyEur beta] Stripe webhook failures need review',
      heading: 'Stripe webhook monitoring alert',
      severity: 'critical',
      body: [
        `Failed Stripe webhook events updated since ${sinceIso}: ${failedWebhooks}.`,
        `Webhook events still processing before ${staleWebhookBeforeIso}: ${staleProcessingWebhooks}.`,
        'Review Supabase stripe_webhook_events, Stripe webhook delivery logs, entitlement state, and billing support queue before inviting or expanding public beta users.',
      ],
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://complyeur.com'}/admin/metrics`,
      actionLabel: 'Open metrics',
      tags: [
        { name: 'category', value: 'operations' },
        { name: 'monitor', value: 'stripe-webhook' },
      ],
    })

    webhookAlertSent = result.success

    if (!result.success) {
      logger.error('[Beta Monitoring Cron] Stripe webhook alert email failed', {
        error: result.error,
      })
    }
  }

  const results = {
    windowHours,
    since: sinceIso,
    companiesCreated,
    usersCreated,
    failedWebhooks,
    staleProcessingWebhooks,
    zeroSignupAlert: shouldSendZeroSignupAlert,
    zeroSignupAlertSent,
    webhookAlert: shouldSendWebhookAlert,
    webhookAlertSent,
  }

  logger.info('[Beta Monitoring Cron] Run complete', { results })

  return NextResponse.json({ success: true, results })
}

export const GET = withCronAuth(handleBetaMonitoringCron)
export const POST = withCronAuth(handleBetaMonitoringCron)
