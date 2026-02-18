'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/env'
import { validateRedirectUrl } from '@/lib/utils/redirect'
import { rateLimit } from '@/lib/rate-limit'
import {
  AuthError,
  ValidationError,
  DatabaseError,
  getAuthErrorMessage,
  getDatabaseErrorMessage,
} from '@/lib/errors'
import {
  loginSchema,
  emailSignupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/lib/validations/auth'

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

export async function login(formData: FormData) {
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await rateLimit(ip, 'auth')
  if (!rl.success) throw new AuthError('Too many login attempts. Please wait a moment and try again.')

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
    throw new ValidationError(errorMessage)
  }

  const { email, password } = result.data!

  // Normalize email for consistency
  const normalizedEmail = normalizeEmailForAuth(email)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    throw new AuthError(getAuthErrorMessage(error))
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

export async function signup(formData: FormData) {
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await rateLimit(ip, 'auth')
  if (!rl.success) throw new AuthError('Too many signup attempts. Please wait a moment and try again.')

  const supabase = await createClient()

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
    throw new ValidationError(errorMessage)
  }

  const { name, email, companyName, password } = result.data!
  const { firstName, lastName } = splitFullName(name)

  // Normalize email for Supabase (some instances reject + signs)
  const normalizedEmail = normalizeEmailForAuth(email)

  // Create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  })

  if (authError) {
    const err = authError!
    const errorMessage = err.message ?? ''
    if (errorMessage.includes('Email address') && errorMessage.includes('is invalid') && normalizedEmail.includes('+')) {
      throw new AuthError('Email addresses with special characters like "+" may not be supported. Please try using a different email address or contact support.')
    }

    throw new AuthError(getAuthErrorMessage(err))
  }

  if (!authData.user) {
    throw new AuthError('Failed to create user account')
  }

  const user = authData.user!

  // Create the company and profile using the database function.
  // Terms are accepted passively on signup page.
  const termsAcceptedAt = new Date().toISOString()
  const fullSignature = await supabase.rpc('create_company_and_profile', {
    user_id: user.id,
    user_email: normalizedEmail,
    company_name: companyName,
    user_terms_accepted_at: termsAcceptedAt,
    user_auth_provider: 'email',
    user_first_name: firstName,
    user_last_name: lastName,
  })

  let companyId = fullSignature.data
  let signupError = fullSignature.error

  // Backward compatibility for environments that only support the legacy signature
  if (signupError?.code === 'PGRST202') {
    const legacySignature = await supabase.rpc('create_company_and_profile', {
      user_id: user.id,
      user_email: normalizedEmail,
      company_name: companyName,
      user_terms_accepted_at: termsAcceptedAt,
    })
    companyId = legacySignature.data
    signupError = legacySignature.error
  }

  if (signupError) {
    console.error('Signup RPC error:', signupError)
    throw new DatabaseError(getDatabaseErrorMessage(signupError!))
  }

  if (!companyId) {
    throw new DatabaseError('Failed to create company. Please try again.')
  }

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

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function forgotPassword(formData: FormData) {
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await rateLimit(ip, 'password-reset')
  if (!rl.success) throw new AuthError('Too many password reset attempts. Please wait an hour before trying again.')

  const supabase = await createClient()
  const baseUrl = getBaseUrl(requestHeaders)

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
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
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
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rl = await rateLimit(ip, 'auth')
  if (!rl.success) throw new AuthError('Too many sign-in attempts. Please wait a moment and try again.')

  const supabase = await createClient()
  const baseUrl = getBaseUrl(requestHeaders)

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
