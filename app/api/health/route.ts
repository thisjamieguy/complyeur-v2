import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Lightweight probe — validates a live DB round-trip without touching business tables.
    // Type assertion needed until `npm run db:types` is run after the ping() migration.
    const supabase = await createClient()
    const { error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ error: unknown }>)('ping')

    if (error) throw error

    return NextResponse.json(
      { status: 'ok' },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch {
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
}

// Support POST as well for flexibility
export async function POST() {
  return GET()
}
