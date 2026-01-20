import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { version } from '../../../package.json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const start = Date.now()

  try {
    // Test database connectivity
    const supabase = await createClient()
    const { error } = await supabase.from('companies').select('id').limit(1)

    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: version,
      database: 'connected',
      responseTime: `${Date.now() - start}ms`
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: version,
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${Date.now() - start}ms`
    }, { status: 503 })
  }
}

// Support POST as well for flexibility
export async function POST() {
  return GET()
}
