import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * The interactive calendar has been consolidated into the single `/calendar`
 * route, where interactivity is controlled by the ENABLE_INTERACTIVE_CALENDAR
 * feature flag. This route now redirects so existing links keep working.
 */
export default function CalendarV2Redirect() {
  redirect('/calendar')
}
