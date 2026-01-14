'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/env'
import {
  AuthError,
  ValidationError,
  DatabaseError,
  getAuthErrorMessage,
  getDatabaseErrorMessage,
} from '@/lib/errors'
import {
  loginSchema,
  signupSchema,
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

export async function login(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Validate input
  const result = loginSchema.safeParse(rawData)
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message)
  }

  const { email, password } = result.data

  // Normalize email for consistency
  const normalizedEmail = normalizeEmailForAuth(email)

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error) {
    throw new AuthError(getAuthErrorMessage(error))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    companyName: formData.get('companyName') as string,
    termsAccepted: formData.get('termsAccepted') === 'true',
  }

  // Validate input
  const result = signupSchema.safeParse(rawData)
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message)
  }

  const { email, password, companyName, termsAccepted } = result.data

  // Ensure terms are accepted (double check on server side)
  if (!termsAccepted) {
    throw new ValidationError('You must agree to the Terms of Service and Privacy Policy')
  }

  // Normalize email for Supabase (some instances reject + signs)
  const normalizedEmail = normalizeEmailForAuth(email)

  // Create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  })

  if (authError) {
    // Check for specific email validation errors that might need special handling
    if (authError.message.includes('Email address') && authError.message.includes('is invalid') && normalizedEmail.includes('+')) {
      throw new AuthError('Email addresses with special characters like "+" may not be supported. Please try using a different email address or contact support.')
    }

    throw new AuthError(getAuthErrorMessage(authError))
  }

  if (!authData.user) {
    throw new AuthError('Failed to create user account')
  }

  // Create the company and profile using the database function
  // This bypasses RLS during signup since the user isn't fully authenticated yet
  // Store the terms acceptance timestamp
  const { data: companyId, error: signupError } = await supabase
    .rpc('create_company_and_profile', {
      user_id: authData.user.id,
      user_email: normalizedEmail,
      company_name: companyName,
      user_terms_accepted_at: new Date().toISOString(),
    })

  if (signupError) {
    console.error('Signup RPC error:', signupError)
    throw new DatabaseError(getDatabaseErrorMessage(signupError))
  }

  if (!companyId) {
    throw new DatabaseError('Failed to create company. Please try again.')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const requestHeaders = await headers()
  const baseUrl = getBaseUrl(requestHeaders)

  const rawData = {
    email: formData.get('email') as string,
  }

  // Validate input
  const result = forgotPasswordSchema.safeParse(rawData)
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message)
  }

  const { email } = result.data

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
  const supabase = await createClient()

  const rawData = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  // Validate input
  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message)
  }

  const { password } = result.data

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
  const supabase = await createClient()
  const requestHeaders = await headers()
  const baseUrl = getBaseUrl(requestHeaders)

  // Validate redirectTo to prevent open redirect attacks
  let validatedRedirect = '/dashboard'
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    validatedRedirect = redirectTo
  }

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
