import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Keep the probe lightweight while still validating a live DB round-trip.
    const supabase = await createClient()
    const { error } = await supabase.from('companies').select('id').limit(1)

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
