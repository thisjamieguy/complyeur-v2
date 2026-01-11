import { NextRequest, NextResponse } from 'next/server'
import { runRetentionPurge } from '@/lib/gdpr'

/**
 * GDPR Data Retention Auto-Purge Cron Endpoint
 *
 * This endpoint runs the data retention purge process that:
 * 1. Deletes trips older than the company's retention period
 * 2. Hard deletes employees who were soft-deleted more than 30 days ago
 * 3. Removes orphaned employees with no trips and no recent activity
 *
 * Security:
 * - Requires CRON_SECRET header to match environment variable
 * - Designed to be called by Vercel Cron or similar scheduler
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/gdpr/cron/retention",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 *
 * The schedule "0 3 * * *" runs at 3:00 AM UTC daily.
 */
export async function GET(request: NextRequest) {
  // Verify the request is from the cron job
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If CRON_SECRET is set, verify it
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Retention Cron] Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  } else {
    // In development, allow without secret but log warning
    console.warn('[Retention Cron] Running without CRON_SECRET - not recommended for production')
  }

  console.log('[Retention Cron] Starting data retention purge...')

  try {
    const result = await runRetentionPurge()

    console.log('[Retention Cron] Purge completed:', {
      success: result.success,
      companiesProcessed: result.companiesProcessed,
      totalTripsDeleted: result.totalTripsDeleted,
      totalEmployeesDeleted: result.totalEmployeesDeleted,
      executionTime: `${result.executionTime}ms`,
    })

    if (!result.success) {
      console.error('[Retention Cron] Errors encountered:', result.errors)
    }

    return NextResponse.json({
      success: result.success,
      summary: {
        companiesProcessed: result.companiesProcessed,
        tripsDeleted: result.totalTripsDeleted,
        employeesDeleted: result.totalEmployeesDeleted,
        executionTimeMs: result.executionTime,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error('[Retention Cron] Fatal error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST is also supported for manual triggers via API
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
