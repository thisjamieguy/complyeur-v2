'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const companyName = formData.get('companyName') as string

  if (!email || !password || !confirmPassword || !companyName) {
    throw new Error('All fields are required')
  }

  if (password !== confirmPassword) {
    throw new Error('Passwords do not match')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  // Create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('Failed to create user account')
  }

  // Create the company and profile using the database function
  // This bypasses RLS during signup since the user isn't fully authenticated yet
  const { data: companyId, error: signupError } = await supabase
    .rpc('create_company_and_profile', {
      user_id: authData.user.id,
      user_email: email,
      company_name: companyName
    })

  if (signupError) {
    throw new Error('Failed to create company and profile: ' + signupError.message)
  }

  if (!companyId) {
    throw new Error('Failed to create company and profile: no company ID returned')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  if (!email) {
    throw new Error('Email is required')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) {
    throw new Error(error.message)
  }

  // Return success message - don't redirect
  return { success: true, message: 'Check your email for a password reset link' }
}

export async function logout() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}
