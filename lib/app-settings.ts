import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const INTERACTIVE_CALENDAR_SETTING_KEY = 'interactive_calendar_enabled'

export const getInteractiveCalendarGlobalSetting = cache(async (): Promise<boolean | undefined> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('app_settings')
    .select('value_boolean')
    .eq('key', INTERACTIVE_CALENDAR_SETTING_KEY)
    .maybeSingle()

  if (error) {
    console.error('[app-settings] Failed to load interactive calendar setting:', error.message)
    return undefined
  }

  return data?.value_boolean ?? undefined
})
