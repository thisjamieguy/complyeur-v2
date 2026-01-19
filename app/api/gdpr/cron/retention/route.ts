import { NextRequest, NextResponse } from 'next/server'
import { runRetentionPurge } from '@/lib/gdpr'
import { withCronAuth } from '@/lib/security/cron-auth'

/**
 * GDPR Data Retention Auto-Purge Cron Endpoint
 *
 * This endpoint runs the data retention purge process that:
 * 1. Deletes trips older than the company's retention period
 * 2. Hard deletes employees who were soft-deleted more than 30 days ago
 * 3. Removes orphaned employees with no trips and no recent activity
 *
 * Security (Fail-Closed):
 * - REQUIRES valid CRON_SECRET in Authorization header (Bearer token)
 * - Missing or invalid secret = 401 rejection (no bypass)
 * - Production requires CRON_SECRET at boot time
 * - SOC 2 Controls: CC6 (Logical Access), A1 (Availability)
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
async function handleRetentionPurge(_request: NextRequest): Promise<NextResponse> {
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

// Wrap with fail-closed CRON authentication
export const GET = withCronAuth(handleRetentionPurge)

/**
 * POST is also supported for manual triggers via API
 * Same fail-closed authentication applies
 */
export const POST = withCronAuth(handleRetentionPurge)
