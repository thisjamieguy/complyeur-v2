import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger.mjs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function createHealthyResponse() {
  return NextResponse.json(
    { status: 'ok' },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

function createUnhealthyResponse() {
  return NextResponse.json(
    { status: 'error' },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
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

async function runPingProbe() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient()
    const { error } = await admin.rpc('ping')
    return { admin, error, probe: 'admin-rpc' as const }
  }

  const supabase = await createClient()
  const { error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ error: unknown }>)('ping')

  return { admin: null, error, probe: 'server-rpc' as const }
}

// Rate limiting: handled by middleware (60 req/min per IP for all /api/* routes)
export async function GET() {
  try {
    // Lightweight probe — validates a live DB round-trip without touching business tables.
    // Prefer the explicit admin client in server environments so health checks do not depend on request cookies.
    // Type assertion needed until `npm run db:types` is run after the ping() migration.
    const { admin, error, probe } = await runPingProbe()

    if (!error) return createHealthyResponse()

    if (process.env.SUPABASE_SERVICE_ROLE_KEY && isMissingPingProbe(error)) {
      logger.warn('[Health] ping() probe unavailable, falling back to admin table probe', {
        error,
        probe,
      })

      const fallbackAdmin = admin ?? createAdminClient()
      const { error: adminError } = await fallbackAdmin
        .from('profiles')
        .select('id', { head: true })
        .limit(1)

      if (!adminError) return createHealthyResponse()

      logger.error('[Health] Admin fallback probe failed', { error: adminError })
    }

    throw error
  } catch (error) {
    logger.error('[Health] Database health probe failed', { error })

    return createUnhealthyResponse()
  }
}
