import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

interface AuditLogParams {
  adminUserId: string
  targetCompanyId?: string
  targetUserId?: string
  action: string
  details?: Record<string, unknown>
  detailsBefore?: Record<string, unknown>
  detailsAfter?: Record<string, unknown>
}

/**
 * Logs an admin action to the audit log.
 *
 * This should be called after every admin action that modifies data.
 * The audit log provides accountability and helps with debugging.
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createAdminClient()
    const headersList = await headers()

    // Extract IP address from headers
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      headersList.get('x-real-ip') ||
                      null

    const userAgent = headersList.get('user-agent') || null

    await supabase.from('admin_audit_log').insert({
      admin_user_id: params.adminUserId,
      target_company_id: params.targetCompanyId,
      target_user_id: params.targetUserId,
      action: params.action,
      details: params.details || {},
      details_before: params.detailsBefore,
      details_after: params.detailsAfter,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break admin actions
    console.error('Failed to log admin action:', error)
  }
}

/**
 * Common admin action types for consistency
 */
export const ADMIN_ACTIONS = {
  // Company actions
  COMPANY_VIEWED: 'company.viewed',
  COMPANY_SUSPENDED: 'company.suspended',
  COMPANY_RESTORED: 'company.restored',

  // Entitlement actions
  ENTITLEMENT_UPDATED: 'entitlement.updated',
  TIER_CHANGED: 'tier.changed',
  TRIAL_EXTENDED: 'trial.extended',
  TRIAL_CONVERTED: 'trial.converted',

  // Note actions
  NOTE_CREATED: 'note.created',
  NOTE_UPDATED: 'note.updated',
  NOTE_DELETED: 'note.deleted',
  NOTE_PINNED: 'note.pinned',
  NOTE_UNPINNED: 'note.unpinned',

  // User actions
  USER_PASSWORD_RESET: 'user.password_reset',
  USER_DEACTIVATED: 'user.deactivated',
  USER_REACTIVATED: 'user.reactivated',

  // Tier actions
  TIER_CREATED: 'tier.created',
  TIER_UPDATED: 'tier.updated',
  TIER_DEACTIVATED: 'tier.deactivated',
} as const

export type AdminAction = typeof ADMIN_ACTIONS[keyof typeof ADMIN_ACTIONS]
