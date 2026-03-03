import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOnboardingDay1Email, sendOnboardingDay3Email } from '@/lib/services/email-service'
import { withCronAuth } from '@/lib/security/cron-auth'
import { logger } from '@/lib/logger.mjs'

/**
 * Onboarding Email Sequence Cron
 *
 * Runs daily and sends two onboarding nudges:
 *
 *   Day 1 — "Add your first employee"
 *     Targets: companies >= 24h old, no employees added, not already sent
 *
 *   Day 3 — "Log your first trip"
 *     Targets: companies >= 72h old, has employees but no trips, not already sent
 *
 * Sends are tracked in `onboarding_email_log` to prevent duplicates on retries.
 * Companies older than 14 days are excluded (past the activation window).
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/onboarding",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
async function handleOnboardingCron(): Promise<NextResponse> {
  logger.info('[Onboarding Cron] Starting onboarding email run')

  const admin = createAdminClient()
  const now = new Date()

  const results = {
    day1: { sent: 0, skipped: 0, errors: 0 },
    day3: { sent: 0, skipped: 0, errors: 0 },
  }

  // -------------------------------------------------------------------------
  // Day 1: companies >= 24h old, no employees, email not yet sent
  // -------------------------------------------------------------------------
  const day1MinAge = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const maxAge = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: day1Candidates, error: day1Error } = await admin
    .from('companies')
    .select('id, name, email')
    .lte('created_at', day1MinAge)
    .gte('created_at', maxAge)
    .not('email', 'is', null)

  if (day1Error) {
    logger.error('[Onboarding Cron] Failed to query day1 candidates', { error: day1Error })
    return NextResponse.json({ success: false, error: 'Failed to process onboarding emails' }, { status: 500 })
  }

  for (const company of day1Candidates ?? []) {
    // Check not already sent
    const { data: alreadySent } = await admin
      .from('onboarding_email_log')
      .select('id')
      .eq('company_id', company.id)
      .eq('step', 'day1_add_employee')
      .maybeSingle()

    if (alreadySent) {
      results.day1.skipped++
      continue
    }

    // Check they still have no employees
    const { count: employeeCount } = await admin
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)

    if ((employeeCount ?? 0) > 0) {
      results.day1.skipped++
      // Still log it so we don't keep checking
      await admin.from('onboarding_email_log').insert({
        company_id: company.id,
        step: 'day1_add_employee',
      }).select().maybeSingle()
      continue
    }

    const emailResult = await sendOnboardingDay1Email({
      recipientEmail: company.email!,
      companyName: company.name ?? undefined,
    })

    if (emailResult.success) {
      await admin.from('onboarding_email_log').insert({
        company_id: company.id,
        step: 'day1_add_employee',
      })
      results.day1.sent++
      logger.info('[Onboarding Cron] Day1 email sent', { companyId: company.id })
    } else {
      results.day1.errors++
      logger.error('[Onboarding Cron] Day1 email failed', {
        companyId: company.id,
        error: emailResult.error,
      })
    }
  }

  // -------------------------------------------------------------------------
  // Day 3: companies >= 72h old, has employees, no trips, email not yet sent
  // -------------------------------------------------------------------------
  const day3MinAge = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()

  const { data: day3Candidates, error: day3Error } = await admin
    .from('companies')
    .select('id, name, email')
    .lte('created_at', day3MinAge)
    .gte('created_at', maxAge)
    .not('email', 'is', null)

  if (day3Error) {
    logger.error('[Onboarding Cron] Failed to query day3 candidates', { error: day3Error })
    return NextResponse.json({ success: false, error: 'Failed to process onboarding emails' }, { status: 500 })
  }

  for (const company of day3Candidates ?? []) {
    // Check not already sent
    const { data: alreadySent } = await admin
      .from('onboarding_email_log')
      .select('id')
      .eq('company_id', company.id)
      .eq('step', 'day3_add_trip')
      .maybeSingle()

    if (alreadySent) {
      results.day3.skipped++
      continue
    }

    // Must have at least one employee
    const { count: employeeCount } = await admin
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)

    if ((employeeCount ?? 0) === 0) {
      results.day3.skipped++
      continue
    }

    // Must have no trips
    const { count: tripCount } = await admin
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)

    if ((tripCount ?? 0) > 0) {
      results.day3.skipped++
      // Log so we don't keep checking
      await admin.from('onboarding_email_log').insert({
        company_id: company.id,
        step: 'day3_add_trip',
      }).select().maybeSingle()
      continue
    }

    const emailResult = await sendOnboardingDay3Email({
      recipientEmail: company.email!,
      companyName: company.name ?? undefined,
    })

    if (emailResult.success) {
      await admin.from('onboarding_email_log').insert({
        company_id: company.id,
        step: 'day3_add_trip',
      })
      results.day3.sent++
      logger.info('[Onboarding Cron] Day3 email sent', { companyId: company.id })
    } else {
      results.day3.errors++
      logger.error('[Onboarding Cron] Day3 email failed', {
        companyId: company.id,
        error: emailResult.error,
      })
    }
  }

  logger.info('[Onboarding Cron] Run complete', { results })

  return NextResponse.json({ success: true, results })
}

export const GET = withCronAuth(handleOnboardingCron)
export const POST = withCronAuth(handleOnboardingCron)
