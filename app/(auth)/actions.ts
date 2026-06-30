'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/env'
import { validateRedirectUrl } from '@/lib/utils/redirect'
import { rateLimit } from '@/lib/rate-limit'
import { getTrustedClientIpFromHeaders } from '@/lib/security/client-ip'
import {
  AuthError,
  ValidationError,
  getAuthErrorMessage,
} from '@/lib/errors'
import {
  loginSchema,
  emailSignupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth'
import { sendWelcomeEmail } from '@/lib/services/email-service'
import { logger } from '@/lib/logger.mjs'

const SIGNUP_PARITY_REDIRECT = '/check-email'

type SignupActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string }

type LoginActionResult = { success: false; error: string }

export type LoginActionState = {
  error: string | null
  email: string
}

const INITIAL_LOGIN_ACTION_STATE: LoginActionState = {
  error: null,
  email: '',
}

function getSignupRedirectPath(redirectTo: string | null | undefined): string {
  const validatedRedirect = validateRedirectUrl(redirectTo)

  if (validatedRedirect === '/dashboard') {
    return SIGNUP_PARITY_REDIRECT
  }

  return `${SIGNUP_PARITY_REDIRECT}?next=${encodeURIComponent(validatedRedirect)}`
}

function isExistingAccountErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('already exists')
  )
}

/**
 * Normalizes email address for Supabase auth
 * Some Supabase instances reject emails with + signs even though they're valid
 * This function normalizes the email by lowercasing and trimming
 */
function normalizeEmailForAuth(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Splits a full name into first and last name components.
 * Single-token names are stored in first_name only.
 */
function splitFullName(name: string): { firstName: string; lastName: string | null } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ''
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null
  return { firstName, lastName }
}

function getRequestIp(requestHeaders: Pick<Headers, 'get'>): string {
  return (
    getTrustedClientIpFromHeaders(requestHeaders, { fallbackIp: '127.0.0.1' }) ??
    '127.0.0.1'
  )
}

export async function login(formData: FormData) {
  const requestHeaders = await headers()
  const ip = getRequestIp(requestHeaders)
  const rl = await rateLimit(ip, 'auth')
  if (!rl.success) {
    return {
      success: false,
      error: 'Too many login attempts. Please wait a moment and try again.',
    } satisfies LoginActionResult
  }

  const supabase = await createClient()
  const redirectTo = validateRedirectUrl(formData.get('redirectTo') as string | null)

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Validate input
  const result = loginSchema.safeParse(rawData)
  if (!result.success) {
    const errorMessage = result.error?.issues[0]?.message ?? 'Invalid input'
    return { success: false, error: errorMessage } satisfies LoginActionResult
  }

  const { email, password } = result.data!

  // Normalize email for consistency
  const normalizedEmail = normalizeEmailForAuth(email)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    return { success: false, error: getAuthErrorMessage(error) } satisfies LoginActionResult
  }

  if (data.user) {
    const { error: activityError } = await supabase
      .from('profiles')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', data.user.id)

    if (activityError) {
      // Don't block login if activity tracking columns/migrations are not deployed yet.
      console.warn('Failed to update last activity during login:', activityError.message)
    }
  }
  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function loginWithFormState(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const submittedEmail = formData.get('email')
  const result = await login(formData)

  if (result?.success === false) {
    return {
      error: result.error,
      email: typeof submittedEmail === 'string' ? submittedEmail : '',
    }
  }

  return INITIAL_LOGIN_ACTION_STATE
}

export async function signup(formData: FormData) {
  const requestHeaders = await headers()
  const ip = getRequestIp(requestHeaders)
  const rl = await rateLimit(ip, 'auth')
  if (!rl.success) {
    return {
      success: false,
      error: 'Too many signup attempts. Please wait a moment and try again.',
    } satisfies SignupActionResult
  }

  const supabase = await createClient()
  const signupRedirectPath = getSignupRedirectPath(
    formData.get('redirectTo') as string | null
  )

  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    companyName: formData.get('companyName') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  // Validate input
  const result = emailSignupSchema.safeParse(rawData)
  if (!result.success) {
    const errorMessage = result.error?.issues[0]?.message ?? 'Invalid input'
    return { success: false, error: errorMessage } satisfies SignupActionResult
  }

  const { name, email, companyName, password } = result.data!
  const { firstName, lastName } = splitFullName(name)

  // Normalize email for Supabase (some instances reject + signs)
  const normalizedEmail = normalizeEmailForAuth(email)

  // Create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        company_name: companyName,
        full_name: name,
        given_name: firstName,
        family_name: lastName,
      },
    },
  })

  if (authError) {
    const err = authError!
    const errorMessage = err.message ?? ''
    if (isExistingAccountErrorMessage(errorMessage)) {
      return { success: true, redirectTo: signupRedirectPath } satisfies SignupActionResult
    }
    if (errorMessage.includes('Email address') && errorMessage.includes('is invalid') && normalizedEmail.includes('+')) {
      return {
        success: false,
        error: 'Email addresses with special characters like "+" may not be supported. Please try using a different email address or contact support.',
      } satisfies SignupActionResult
    }

    return { success: false, error: getAuthErrorMessage(err) } satisfies SignupActionResult
  }

  // Supabase can return obfuscated user data when an account already exists and
  // anti-enumeration protections are enabled. Treat this as a parity-success path.
  if (!authData.user || authData.user.identities?.length === 0) {
    return { success: true, redirectTo: signupRedirectPath } satisfies SignupActionResult
  }

  const user = authData.user!

  const { error: activityError } = await supabase
    .from('profiles')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', user.id)

  if (activityError) {
    console.warn(
      'Failed to update last activity during signup:',
      activityError?.message ?? 'Unknown error'
    )
  }

  const welcomeEmailResult = await sendWelcomeEmail({
    recipientEmail: normalizedEmail,
    recipientName: name,
    companyName,
  })

  if (!welcomeEmailResult.success) {
    logger.warn('[Auth] Welcome email failed after signup', {
      recipientEmail: normalizedEmail,
      error: welcomeEmailResult.error,
    })
  }

  // Keep signup response parity between existing and new accounts.
  // New users are redirected to login after account provisioning.
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
    if (signOutError) {
      logger.warn('[Auth] Local sign-out skipped after signup', {
        error: signOutError.message,
      })
    }
  } catch (signOutError) {
    logger.warn('[Auth] Local sign-out failed after signup', {
      error: signOutError instanceof Error ? signOutError.message : 'Unknown error',
    })
  }

  revalidatePath('/', 'layout')
  return { success: true, redirectTo: signupRedirectPath } satisfies SignupActionResult
}

export async function forgotPassword(formData: FormData) {
  const requestHeaders = await headers()
  const ip = getRequestIp(requestHeaders)
  const rl = await rateLimit(ip, 'password-reset')
  if (!rl.success) throw new AuthError('Too many password reset attempts. Please wait an hour before trying again.')

  const supabase = await createClient()
  const baseUrl = getBaseUrl()

  const rawData = {
    email: formData.get('email') as string,
  }

  // Validate input
  const result = forgotPasswordSchema.safeParse(rawData)
  if (!result.success) {
    const errorMessage = result.error?.issues[0]?.message ?? 'Invalid input'
    throw new ValidationError(errorMessage)
  }

  const { email } = result.data!

  // Redirect through auth callback to exchange token for session,
  // then redirect to reset-password page
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
  })

  if (error) {
    throw new AuthError(getAuthErrorMessage(error))
  }

  // Return success message - don't redirect
  return { success: true, message: 'Check your email for a password reset link' }
}

export async function resetPassword(formData: FormData) {
  const requestHeaders = await headers()
  const ip = getRequestIp(requestHeaders)
  const rl = await rateLimit(ip, 'password-reset')
  if (!rl.success) throw new AuthError('Too many password reset attempts. Please wait an hour before trying again.')

  const supabase = await createClient()

  const rawData = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  // Validate input
  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) {
    const errorMessage = result.error?.issues[0]?.message ?? 'Invalid input'
    throw new ValidationError(errorMessage)
  }

  const { password } = result.data!

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    throw new AuthError(getAuthErrorMessage(error))
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function logout() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new AuthError(getAuthErrorMessage(error))
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Initiates Google OAuth sign-in flow.
 * Redirects the user to Google's consent screen.
 *
 * @param redirectTo - Optional path to redirect to after successful auth (must be relative)
 */
export async function signInWithGoogle(redirectTo?: string) {
  const requestHeaders = await headers()
  const ip = getRequestIp(requestHeaders)
  const rl = await rateLimit(ip, 'auth')
  if (!rl.success) throw new AuthError('Too many sign-in attempts. Please wait a moment and try again.')

  const supabase = await createClient()
  const baseUrl = getBaseUrl()

  // Validate redirectTo to prevent open redirect attacks
  const validatedRedirect = validateRedirectUrl(redirectTo)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(validatedRedirect)}`,
      queryParams: {
        // Request minimal scopes for security
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    throw new AuthError(getAuthErrorMessage(error))
  }

  if (data.url) {
    redirect(data.url)
  }

  throw new AuthError('Failed to initiate Google sign-in')
}
