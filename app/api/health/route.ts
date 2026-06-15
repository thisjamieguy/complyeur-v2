import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger.mjs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function healthResponse(status: 'ok' | 'error', init?: ResponseInit) {
  return NextResponse.json(
    { status },
    {
      ...init,
      headers: {
        'Cache-Control': 'no-store',
        ...init?.headers,
      },
    }
  )
}

// Public health is intentionally low-privilege: anon ping() only, no service-role fallback.
// Deep vendor/database diagnostics live behind CRON_SECRET at /api/internal/health.
export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ error: unknown }>)('ping')

    if (!error) return healthResponse('ok')

    throw error
  } catch (error) {
    logger.error('[Health] Public ping probe failed', { error })
    return healthResponse('error', { status: 503 })
  }
}
