'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import {
  isOwnerOrAdmin,
  hasPermission,
  PERMISSIONS,
  ROLES,
  type UserRole,
} from '@/lib/permissions'

type TeamRole = Exclude<UserRole, 'owner'>

const TEAM_ROLES: TeamRole[] = ['admin', 'manager', 'viewer']

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
  warning?: string
}

export interface TeamMember {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  role: string | null
  created_at: string | null
}

export interface TeamInvite {
  id: string
  email: string
  role: TeamRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface SeatUsage {
  active_users: number
  pending_invites: number
  limit: number
  available: number
}

interface TeamSnapshot {
  currentUserId: string
  currentRole: string | null
  canManageUsers: boolean
  isOwner: boolean
  seatUsage: SeatUsage
  members: TeamMember[]
  invites: TeamInvite[]
}

interface ActorContext {
  userId: string
  userEmail: string
  companyId: string
  role: string | null
}

function getAdminClientResult() {
  try {
    return { ok: true as const, client: createAdminClient() }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin client unavailable'
    return { ok: false as const, error: message }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isRecoverableInviteError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('user already registered') ||
    lower.includes('already exists')
  )
}

function isValidInviteRole(role: string): role is TeamRole {
  return TEAM_ROLES.includes(role as TeamRole)
}

function parseSeatUsage(raw: unknown): SeatUsage {
  if (!raw || typeof raw !== 'object') {
    return { active_users: 0, pending_invites: 0, limit: 0, available: 0 }
  }

  const obj = raw as Record<string, unknown>
  return {
    active_users: Number(obj.active_users ?? 0),
    pending_invites: Number(obj.pending_invites ?? 0),
    limit: Number(obj.limit ?? 0),
    available: Number(obj.available ?? 0),
  }
}

async function getActorContext(): Promise<ActionResult<ActorContext>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.company_id) {
    return { success: false, error: 'Profile not found' }
  }

  if (!hasPermission(profile.role, PERMISSIONS.SETTINGS_VIEW)) {
    return { success: false, error: 'Forbidden' }
  }

  return {
    success: true,
    data: {
      userId: user.id,
      userEmail: normalizeEmail(user.email ?? ''),
      companyId: profile.company_id,
      role: profile.role,
    },
  }
}

async function expireOldInvites(companyId: string): Promise<void> {
  const adminResult = getAdminClientResult()
  if (!adminResult.ok) return
  const admin = adminResult.client
  const nowIso = new Date().toISOString()

  await admin
    .from('company_user_invites')
    .update({ status: 'expired', updated_at: nowIso })
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .lte('expires_at', nowIso)
}

async function getSeatUsage(companyId: string): Promise<SeatUsage> {
  const adminResult = getAdminClientResult()
  if (!adminResult.ok) {
    return { active_users: 0, pending_invites: 0, limit: 0, available: 0 }
  }
  const admin = adminResult.client

  const { data } = await admin.rpc('get_company_seat_usage', {
    p_company_id: companyId,
  })

  return parseSeatUsage(data)
}

export async function listTeamMembersAndInvites(): Promise<ActionResult<TeamSnapshot>> {
  const actorResult = await getActorContext()
  if (!actorResult.success || !actorResult.data) {
    return { success: false, error: actorResult.error }
  }

  const actor = actorResult.data
  const adminResult = getAdminClientResult()
  if (!adminResult.ok) {
    return { success: false, error: adminResult.error }
  }
  const admin = adminResult.client

  await expireOldInvites(actor.companyId)

  const [membersResult, invitesResult, seatUsage] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, first_name, last_name, full_name, role, created_at')
      .eq('company_id', actor.companyId)
      .order('created_at', { ascending: true }),
    admin
      .from('company_user_invites')
      .select('id, email, role, status, invited_by, expires_at, accepted_at, created_at')
      .eq('company_id', actor.companyId)
      .order('created_at', { ascending: false })
      .limit(50),
    getSeatUsage(actor.companyId),
  ])

  if (membersResult.error) {
    return { success: false, error: 'Failed to load team members' }
  }

  if (invitesResult.error) {
    return { success: false, error: 'Failed to load team invites' }
  }

  return {
    success: true,
    data: {
      currentUserId: actor.userId,
      currentRole: actor.role,
      canManageUsers: isOwnerOrAdmin(actor.role),
      isOwner: actor.role === ROLES.OWNER,
      seatUsage,
      members: (membersResult.data ?? []) as TeamMember[],
      invites: (invitesResult.data ?? []) as TeamInvite[],
    },
  }
}

export async function inviteTeamMember(email: string, role: TeamRole): Promise<ActionResult> {
  const actorResult = await getActorContext()
  if (!actorResult.success || !actorResult.data) {
    return { success: false, error: actorResult.error }
  }

  const actor = actorResult.data
  if (!isOwnerOrAdmin(actor.role)) {
    return { success: false, error: 'Only owners and admins can invite users' }
  }

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid email address' }
  }

  if (!isValidInviteRole(role)) {
    return { success: false, error: 'Invalid role selected' }
  }

  if (normalizedEmail === actor.userEmail) {
    return { success: false, error: 'You cannot invite yourself' }
  }

  const adminResult = getAdminClientResult()
  if (!adminResult.ok) {
    return { success: false, error: adminResult.error }
  }
  const admin = adminResult.client

  await expireOldInvites(actor.companyId)

  const seatUsage = await getSeatUsage(actor.companyId)
  if ((seatUsage.active_users + seatUsage.pending_invites) >= seatUsage.limit) {
    return {
      success: false,
      error: `User limit reached for current tier (${seatUsage.active_users} active + ${seatUsage.pending_invites} pending / ${seatUsage.limit} max).`,
    }
  }

  const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()

  const { data: inviteRow, error: insertError } = await admin
    .from('company_user_invites')
    .insert({
      company_id: actor.companyId,
      email: normalizedEmail,
      role,
      status: 'pending',
      invited_by: actor.userId,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.message.toLowerCase().includes('duplicate') || insertError.code === '23505') {
      return { success: false, error: 'An active invite already exists for this email.' }
    }
    return { success: false, error: 'Failed to create invite' }
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  const redirectTo = `${appUrl}/auth/callback?next=%2Fsettings%2Fteam`

  const { error: authInviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    { redirectTo }
  )

  if (authInviteError) {
    if (isRecoverableInviteError(authInviteError.message)) {
      revalidatePath('/settings/team')
      return {
        success: true,
        warning: 'Invite saved. This user already has an account, so ask them to use the invite link to join your company.',
      }
    }

    await admin
      .from('company_user_invites')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', inviteRow.id)

    return { success: false, error: `Failed to send invite email: ${authInviteError.message}` }
  }

  revalidatePath('/settings/team')
  return { success: true }
}

export async function updateTeamMemberRole(
  targetUserId: string,
  role: TeamRole
): Promise<ActionResult> {
  const actorResult = await getActorContext()
  if (!actorResult.success || !actorResult.data) {
    return { success: false, error: actorResult.error }
  }

  const actor = actorResult.data
  if (!isOwnerOrAdmin(actor.role)) {
    return { success: false, error: 'Only owners and admins can update roles' }
  }

  if (!isValidInviteRole(role)) {
    return { success: false, error: 'Invalid role selected' }
  }

  if (!targetUserId) {
    return { success: false, error: 'Target user is required' }
  }

  if (targetUserId === actor.userId) {
    return { success: false, error: 'You cannot change your own role' }
  }

  const adminResult = getAdminClientResult()
  if (!adminResult.ok) {
    return { success: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('id, company_id, role')
    .eq('id', targetUserId)
    .single()

  if (targetError || !targetProfile || targetProfile.company_id !== actor.companyId) {
    return { success: false, error: 'User not found in your company' }
  }

  if (targetProfile.role === ROLES.OWNER) {
    return { success: false, error: 'Owner role cannot be changed here. Use transfer ownership.' }
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)
    .eq('company_id', actor.companyId)

  if (updateError) {
    return { success: false, error: 'Failed to update role' }
  }

  revalidatePath('/settings/team')
  return { success: true }
}

export async function removeTeamMember(targetUserId: string): Promise<ActionResult> {
  const actorResult = await getActorContext()
  if (!actorResult.success || !actorResult.data) {
    return { success: false, error: actorResult.error }
  }

  const actor = actorResult.data
  if (!isOwnerOrAdmin(actor.role)) {
    return { success: false, error: 'Only owners and admins can remove users' }
  }

  if (!targetUserId) {
    return { success: false, error: 'Target user is required' }
  }

  if (targetUserId === actor.userId) {
    return { success: false, error: 'You cannot remove yourself' }
  }

  const adminResult = getAdminClientResult()
  if (!adminResult.ok) {
    return { success: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('id, company_id, role, email')
    .eq('id', targetUserId)
    .single()

  if (targetError || !targetProfile || targetProfile.company_id !== actor.companyId) {
    return { success: false, error: 'User not found in your company' }
  }

  if (targetProfile.role === ROLES.OWNER) {
    return { success: false, error: 'Owner cannot be removed. Transfer ownership first.' }
  }

  const { error: deleteError } = await admin
    .from('profiles')
    .delete()
    .eq('id', targetUserId)
    .eq('company_id', actor.companyId)

  if (deleteError) {
    return { success: false, error: 'Failed to remove user' }
  }

  if (targetProfile.email) {
    await admin
      .from('company_user_invites')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('company_id', actor.companyId)
      .eq('email', normalizeEmail(targetProfile.email))
      .eq('status', 'pending')
  }

  revalidatePath('/settings/team')
  return { success: true }
}

export async function transferOwnership(newOwnerUserId: string): Promise<ActionResult> {
  const actorResult = await getActorContext()
  if (!actorResult.success || !actorResult.data) {
    return { success: false, error: actorResult.error }
  }

  const actor = actorResult.data
  if (actor.role !== ROLES.OWNER) {
    return { success: false, error: 'Only the current owner can transfer ownership' }
  }

  if (!newOwnerUserId) {
    return { success: false, error: 'Target user is required' }
  }

  if (newOwnerUserId === actor.userId) {
    return { success: false, error: 'You already own this company' }
  }

  const adminResult = getAdminClientResult()
  if (!adminResult.ok) {
    return { success: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('id, company_id')
    .eq('id', newOwnerUserId)
    .single()

  if (targetError || !targetProfile || targetProfile.company_id !== actor.companyId) {
    return { success: false, error: 'Target user not found in your company' }
  }

  const { error: transferError } = await admin.rpc('transfer_company_ownership', {
    p_company_id: actor.companyId,
    p_current_owner_id: actor.userId,
    p_new_owner_id: newOwnerUserId,
  })

  if (transferError) {
    return { success: false, error: `Failed to transfer ownership: ${transferError.message}` }
  }

  revalidatePath('/settings/team')
  return { success: true }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const actorResult = await getActorContext()
  if (!actorResult.success || !actorResult.data) {
    return { success: false, error: actorResult.error }
  }

  const actor = actorResult.data
  if (!isOwnerOrAdmin(actor.role)) {
    return { success: false, error: 'Only owners and admins can revoke invites' }
  }

  if (!inviteId) {
    return { success: false, error: 'Invite ID is required' }
  }

  const adminResult = getAdminClientResult()
  if (!adminResult.ok) {
    return { success: false, error: adminResult.error }
  }
  const admin = adminResult.client

  const { error: revokeError } = await admin
    .from('company_user_invites')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .eq('company_id', actor.companyId)
    .eq('status', 'pending')

  if (revokeError) {
    return { success: false, error: 'Failed to revoke invite' }
  }

  revalidatePath('/settings/team')
  return { success: true }
}
