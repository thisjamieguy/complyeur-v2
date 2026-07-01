'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin/auth'
import { ADMIN_ACTIONS, logAdminAction } from '@/lib/admin/audit'
import { INTERACTIVE_CALENDAR_SETTING_KEY } from '@/lib/app-settings'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

const updateInteractiveCalendarSchema = z.object({
  enabled: z.boolean(),
})

export async function updateInteractiveCalendarGlobalSetting(input: { enabled: boolean }) {
  const validation = updateInteractiveCalendarSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'Invalid interactive calendar setting' }
  }

  const { user } = await requireSuperAdmin()
  const rateLimit = await checkServerActionRateLimit(
    user.id,
    'updateInteractiveCalendarGlobalSetting'
  )
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.error ?? 'Rate limit exceeded' }
  }

  const supabase = createAdminClient()

  const { data: before } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', INTERACTIVE_CALENDAR_SETTING_KEY)
    .maybeSingle()

  const { data: after, error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key: INTERACTIVE_CALENDAR_SETTING_KEY,
        value_boolean: validation.data.enabled,
        description:
          'Global switch for interactive calendar editing. When disabled, only explicitly allowlisted account emails can use interactive editing.',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select('*')
    .single()

  if (error) {
    console.error('[updateInteractiveCalendarGlobalSetting] Failed to update setting:', error)
    return { success: false, error: 'Failed to update interactive calendar setting' }
  }

  await logAdminAction({
    adminUserId: user.id,
    action: ADMIN_ACTIONS.APP_SETTING_UPDATED,
    details: {
      key: INTERACTIVE_CALENDAR_SETTING_KEY,
      enabled: validation.data.enabled,
    },
    detailsBefore: before ?? undefined,
    detailsAfter: after,
  })

  revalidatePath('/admin/settings')
  revalidatePath('/calendar')

  return { success: true, enabled: validation.data.enabled }
}
