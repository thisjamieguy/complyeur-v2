import type { CookieOptionsWithName } from '@supabase/ssr'

export const SUPABASE_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
}
