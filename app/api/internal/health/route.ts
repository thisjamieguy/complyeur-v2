import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger.mjs'
import { withCronAuth } from '@/lib/security/cron-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function healthResponse(status: 'ok' | 'error', checks: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(
    { status, checks },
    {
      ...init,
      headers: {
        'Cache-Control': 'no-store',
        ...init?.headers,
      },
    }
  )
}

function isMissingPingProbe(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; message?: unknown; details?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code : ''
  const message = typeof candidate.message === 'string' ? candidate.message : ''
  const details = typeof candidate.details === 'string' ? candidate.details : ''
  const haystack = `${message} ${details}`.toLowerCase()

  return code === 'PGRST202' || haystack.includes('public.ping')
}

async function internalHealthHandler() {
  const admin = createAdminClient()
  const checks: Record<string, unknown> = {}

  try {
    const ping = await admin.rpc('ping')
    checks.ping = ping.error ? 'failed' : 'ok'

    if (!ping.error) {
      return healthResponse('ok', checks)
    }

    if (!isMissingPingProbe(ping.error)) {
      throw ping.error
    }

    logger.warn('[InternalHealth] ping() unavailable, falling back to admin table probe', {
      error: ping.error,
    })

    const fallback = await admin
      .from('profiles')
      .select('id', { head: true })
      .limit(1)

    checks.adminTableProbe = fallback.error ? 'failed' : 'ok'
    if (!fallback.error) {
      return healthResponse('ok', checks)
    }

    throw fallback.error
  } catch (error) {
    logger.error('[InternalHealth] Deep health probe failed', { error })
    checks.error = 'internal health probe failed'
    return healthResponse('error', checks, { status: 503 })
  }
}

export const GET = withCronAuth(internalHealthHandler)
export const POST = withCronAuth(internalHealthHandler)
