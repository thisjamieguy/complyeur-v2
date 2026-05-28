'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { companyNameSchema, addEmployeeSchema, inviteTeamSchema } from '@/lib/validations/onboarding'
import { ValidationError, DatabaseError } from '@/lib/errors'
import { inviteTeamMember } from '@/app/(dashboard)/settings/team/actions'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { createEmployee } from '@/lib/db/employees'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company found')

  return { supabase, user, companyId: profile.company_id }
}

export async function updateCompanyName(formData: FormData) {
  const rawData = { companyName: formData.get('companyName') as string }
  const result = companyNameSchema.safeParse(rawData)
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid company name')
  }

  const { supabase, user, companyId } = await getAuthenticatedUser()

  const rateLimit = await checkServerActionRateLimit(user.id, 'updateCompanyName')
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error ?? 'Rate limit exceeded')
  }

  const { error } = await supabase
    .from('companies')
    .update({ name: result.data.companyName })
    .eq('id', companyId)

  if (error) {
    console.error('Failed to update company name:', error)
    throw new DatabaseError('Failed to update company name')
  }

  revalidatePath('/onboarding')
}

export async function addFirstEmployee(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    nationalityType: formData.get('nationalityType') as string,
  }
  const result = addEmployeeSchema.safeParse(rawData)
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid employee data')
  }

  const { user } = await getAuthenticatedUser()

  const rateLimit = await checkServerActionRateLimit(user.id, 'addFirstEmployee')
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error ?? 'Rate limit exceeded')
  }

  try {
    await createEmployee({
      name: result.data.name,
      nationality_type: result.data.nationalityType,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }

    console.error('Failed to create employee:', error)
    throw new DatabaseError('Failed to add employee')
  }

  revalidatePath('/onboarding')
}

export async function inviteTeamMembers(formData: FormData) {
  const emails = [
    formData.get('email0') as string,
    formData.get('email1') as string,
    formData.get('email2') as string,
  ].filter((e) => e && e.trim() !== '')

  if (emails.length === 0) return

  const result = inviteTeamSchema.safeParse({ emails })
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid email address')
  }

  const validEmails = result.data.emails.filter((e) => e !== '')

  if (validEmails.length === 0) return

  for (const email of validEmails) {
    const inviteResult = await inviteTeamMember(email, 'manager', {
      redirectPath: '/onboarding',
      revalidateTarget: '/onboarding',
    })

    if (inviteResult.success) {
      continue
    }

    if (
      inviteResult.error === 'You cannot invite yourself' ||
      inviteResult.error === 'An active invite already exists for this email.'
    ) {
      continue
    }

    throw new Error(inviteResult.error ?? 'Failed to invite team member')
  }

  revalidatePath('/onboarding')
}

export async function completeOnboarding() {
  await completeOnboardingWithRedirect('/dashboard?tour=1')
}

export async function completeOnboardingForImport() {
  await completeOnboardingWithRedirect('/import')
}

async function completeOnboardingWithRedirect(redirectPath: string) {
  const { supabase, user, companyId } = await getAuthenticatedUser()

  const rateLimit = await checkServerActionRateLimit(user.id, 'completeOnboarding')
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error ?? 'Rate limit exceeded')
  }

  const { data: entitlements, error: entitlementError } = await supabase
    .from('company_entitlements')
    .select('subscription_status')
    .eq('company_id', companyId)
    .single()

  if (entitlementError) {
    console.error('Failed to validate billing status during onboarding completion:', entitlementError)
    throw new DatabaseError('Unable to verify billing status')
  }

  const subscriptionStatus = entitlements?.subscription_status
  const isPaid = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  if (!isPaid) {
    throw new ValidationError('Please choose a plan and complete payment before continuing.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('Failed to complete onboarding:', error)
    throw new DatabaseError('Failed to complete onboarding')
  }

  // Sync to user_metadata so middleware can skip the profiles query
  await supabase.auth.updateUser({ data: { onboarding_completed: true } })

  revalidatePath('/', 'layout')
  redirect(redirectPath)
}
