'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

export async function completeDashboardTour() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ dashboard_tour_completed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('[dashboard/tour] Failed to persist tour completion:', error)
    throw new DatabaseError('Unable to save tour progress right now.')
  }

  revalidatePath('/dashboard')
}
