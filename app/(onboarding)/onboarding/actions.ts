'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { companyNameSchema, addEmployeeSchema, inviteTeamSchema } from '@/lib/validations/onboarding'
import { createAdminClient } from '@/lib/supabase/admin'
import { ValidationError, DatabaseError } from '@/lib/errors'
import {
  dispatchInviteEmail,
  normalizeInviteEmail,
} from '@/lib/services/team-invites'

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

  const { supabase, companyId } = await getAuthenticatedUser()

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

  const { supabase, companyId } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('employees')
    .insert({
      company_id: companyId,
      name: result.data.name,
      nationality_type: result.data.nationalityType,
    })

  if (error) {
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

  const { user, companyId } = await getAuthenticatedUser()
  const validEmails = result.data.emails.filter((e) => e !== '')

  if (validEmails.length === 0) return

  const admin = createAdminClient()

  for (const email of validEmails) {
    const normalizedEmail = normalizeInviteEmail(email)
    if (normalizedEmail === normalizeInviteEmail(user.email ?? '')) continue

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: inviteRow, error } = await admin
      .from('company_user_invites')
      .insert({
        company_id: companyId,
        email: normalizedEmail,
        role: 'manager',
        status: 'pending',
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (error) {
      // Skip duplicates silently
      if (error.code === '23505' || error.message?.toLowerCase().includes('duplicate')) {
        continue
      }
      console.error('Failed to invite team member:', error)
      continue
    }

    const dispatchResult = await dispatchInviteEmail(admin, normalizedEmail, '/onboarding')
    if (!dispatchResult.success) {
      await admin
        .from('company_user_invites')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', inviteRow.id)

      console.error('Failed to send onboarding invite email:', dispatchResult.error)
    }
  }

  revalidatePath('/onboarding')
}

export async function completeOnboarding() {
  const { supabase, user, companyId } = await getAuthenticatedUser()

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
  redirect('/dashboard?tour=1')
}
