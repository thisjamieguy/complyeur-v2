/**
 * Team management audit logging.
 *
 * Writes privileged team mutations (invites, role changes, removals,
 * ownership transfer, invite revocations) to the shared `audit_log` table.
 *
 * Failures are swallowed — audit logging must never break the underlying
 * action. Real DB errors are written to the server logs only.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/types/database'

export type TeamAuditAction =
  | 'team.invite_created'
  | 'team.invite_revoked'
  | 'team.member_role_updated'
  | 'team.member_removed'
  | 'team.ownership_transferred'

export type TeamAuditEntityType = 'invite' | 'member' | 'company'

export interface TeamAuditEntry {
  companyId: string
  actorUserId: string
  action: TeamAuditAction
  entityType: TeamAuditEntityType
  entityId?: string | null
  metadata?: Record<string, unknown>
}

const SENSITIVE_KEYS = new Set(['token', 'invite_token', 'password', 'secret', 'authorization'])

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {}
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue
    safe[key] = value
  }
  return safe
}

export async function logTeamAudit(entry: TeamAuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      company_id: entry.companyId,
      user_id: entry.actorUserId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      details: sanitizeMetadata(entry.metadata) as Json,
    })
  } catch (error) {
    console.error('[team-audit] Failed to write audit_log entry:', error)
  }
}
