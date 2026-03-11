export const CALENDAR_HIDE_NO_SCHENGEN_COOKIE =
  'complyeur.calendar.hide_no_schengen'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function parseHideNoSchengenCookie(value: string | undefined | null): boolean {
  return value === '1'
}

export function serializeHideNoSchengenCookie(enabled: boolean): string {
  return [
    `${CALENDAR_HIDE_NO_SCHENGEN_COOKIE}=${enabled ? '1' : '0'}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ].join('; ')
}
