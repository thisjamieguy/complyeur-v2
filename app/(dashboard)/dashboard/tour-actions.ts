'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { checkServerActionRateLimit } from '@/lib/rate-limit'

export async function completeDashboardTour() {
  const { userId } = await requireCompanyAccessCached()

  const rateLimit = await checkServerActionRateLimit(userId, 'completeDashboardTour')
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error ?? 'Rate limit exceeded')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ dashboard_tour_completed_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.error('[dashboard/tour] Failed to persist tour completion:', error)
    throw new DatabaseError('Unable to save tour progress right now.')
  }

  revalidatePath('/dashboard')
}
