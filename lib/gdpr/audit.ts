/**
 * @fileoverview GDPR Audit Logging with Hash Chain Integrity
 *
 * This module provides tamper-evident audit logging for GDPR compliance.
 * Each audit entry includes a hash of its contents and a reference to
 * the previous entry's hash, creating an immutable chain.
 *
 * GDPR Article 30 requires records of processing activities.
 * This implementation ensures audit logs are:
 * - Immutable (hash chain integrity)
 * - Timestamped (created_at)
 * - Attributable (user_id, ip_address)
 * - Comprehensive (details JSONB)
 */

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

/**
 * Standard GDPR action types for consistency
 */
export type GdprAction =
  | 'DSAR_EXPORT'      // Data Subject Access Request export
  | 'ANONYMIZE'        // Employee data anonymized
  | 'SOFT_DELETE'      // Employee soft deleted (30-day recovery)
  | 'RESTORE'          // Employee restored from soft delete
  | 'HARD_DELETE'      // Employee permanently deleted
  | 'AUTO_PURGE'       // System-initiated deletion via retention policy
  | 'BULK_DELETE'      // Bulk data deletion from settings

/**
 * Entity types affected by GDPR actions
 */
export type GdprEntityType = 'employee' | 'trip' | 'company' | 'batch' | 'bulk_data'

/**
 * Input for creating an audit entry
 */
export interface AuditEntry {
  companyId: string
  userId: string
  action: GdprAction
  entityType: GdprEntityType
  entityId: string | null
  details: Record<string, unknown>
  ipAddress?: string
}

/**
 * Details structure for DSAR exports
 */
export type DsarExportDetails = {
  employee_name: string
  employee_id: string
  affected_trips_count: number
  requester_email: string
  export_format: 'zip'
  files_included: string[]
  export_size_bytes?: number
} & Record<string, unknown>

/**
 * Details structure for anonymization
 */
export type AnonymizeDetails = {
  original_name: string
  anonymized_name: string
  reason?: string
} & Record<string, unknown>

/**
 * Details structure for soft delete
 */
export type SoftDeleteDetails = {
  employee_name: string
  affected_trips_count: number
  scheduled_hard_delete: string // ISO date 30 days in future
  reason?: string
} & Record<string, unknown>

/**
 * Details structure for restore
 */
export type RestoreDetails = {
  employee_name: string
  days_until_hard_delete: number
  restored_by: string
} & Record<string, unknown>

/**
 * Details structure for hard delete
 */
export type HardDeleteDetails = {
  employee_name: string
  trips_deleted: number
  deletion_type: 'manual' | 'auto_purge'
  retention_policy_months?: number
} & Record<string, unknown>

/**
 * Details structure for auto-purge batch operations
 */
export type AutoPurgeDetails = {
  employees_deleted: number
  trips_deleted: number
  retention_policy_months: number
  purge_date: string
} & Record<string, unknown>

/**
 * Creates a SHA-256 hash of the audit entry data
 * This is used for tamper detection in the hash chain
 */
async function createEntryHash(
  previousHash: string,
  companyId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
  createdAt: string
): Promise<string> {
  const data = JSON.stringify({
    previousHash,
    companyId,
    userId,
    action,
    entityType,
    entityId,
    details,
    createdAt,
  })

  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Logs a GDPR action with hash chain integrity.
 *
 * @param entry - The audit entry to log
 * @throws Error if logging fails
 *
 * @example
 * ```ts
 * await logGdprAction({
 *   companyId: company.id,
 *   userId: user.id,
 *   action: 'DSAR_EXPORT',
 *   entityType: 'employee',
 *   entityId: employee.id,
 *   details: {
 *     employee_name: employee.name,
 *     affected_trips_count: trips.length,
 *     requester_email: user.email,
 *     export_format: 'zip',
 *     files_included: ['employee_data.json', 'trips.csv']
 *   }
 * })
 * ```
 */
export async function logGdprAction(entry: AuditEntry): Promise<void> {
  const supabase = await createClient()

  // Get the previous hash for chain integrity
  const { data: lastEntry } = await supabase
    .from('audit_log')
    .select('entry_hash')
    .eq('company_id', entry.companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const previousHash = lastEntry?.entry_hash ?? 'GENESIS'
  const createdAt = new Date().toISOString()

  // Create the hash for this entry
  const entryHash = await createEntryHash(
    previousHash,
    entry.companyId,
    entry.userId,
    entry.action,
    entry.entityType,
    entry.entityId ?? 'NONE',
    entry.details,
    createdAt
  )

  // Insert the audit log entry
  const { error } = await supabase.from('audit_log').insert({
    company_id: entry.companyId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    details: entry.details as Json,
    ip_address: entry.ipAddress ?? null,
    previous_hash: previousHash,
    entry_hash: entryHash,
    created_at: createdAt,
  })

  if (error) {
    console.error('[GDPR Audit] Failed to log action:', error)
    throw new Error(`Failed to log GDPR action: ${error.message}`)
  }
}

/**
 * Verifies the integrity of the audit log hash chain for a company.
 * This can be used for compliance audits to prove logs haven't been tampered with.
 *
 * @param companyId - The company to verify
 * @returns Verification result with any integrity issues found
 */
export async function verifyAuditChain(companyId: string): Promise<{
  isValid: boolean
  entriesChecked: number
  issues: Array<{ entryId: string; issue: string }>
}> {
  const supabase = await createClient()

  const { data: entries, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch audit log: ${error.message}`)
  }

  if (!entries || entries.length === 0) {
    return { isValid: true, entriesChecked: 0, issues: [] }
  }

  const issues: Array<{ entryId: string; issue: string }> = []
  let expectedPreviousHash = 'GENESIS'

  for (const entry of entries) {
    // Check previous hash matches expected
    if (entry.previous_hash !== expectedPreviousHash) {
      issues.push({
        entryId: entry.id,
        issue: `Previous hash mismatch: expected ${expectedPreviousHash}, got ${entry.previous_hash}`,
      })
    }

    // Verify the entry hash
    const computedHash = await createEntryHash(
      entry.previous_hash ?? 'GENESIS',
      entry.company_id,
      entry.user_id ?? '',
      entry.action,
      entry.entity_type,
      entry.entity_id ?? '',
      (entry.details as Record<string, unknown>) ?? {},
      entry.created_at
    )

    if (entry.entry_hash !== computedHash) {
      issues.push({
        entryId: entry.id,
        issue: `Entry hash mismatch: possible tampering detected`,
      })
    }

    expectedPreviousHash = entry.entry_hash ?? 'INVALID'
  }

  return {
    isValid: issues.length === 0,
    entriesChecked: entries.length,
    issues,
  }
}

/**
 * Gets GDPR audit entries for a company with optional filtering.
 *
 * @param companyId - The company to fetch logs for
 * @param options - Filtering options
 * @returns Array of audit log entries
 */
export async function getGdprAuditLog(
  companyId: string,
  options?: {
    action?: GdprAction
    entityType?: GdprEntityType
    entityId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }
): Promise<Array<{
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  userId: string | null
  createdAt: string
}>> {
  const supabase = await createClient()

  let query = supabase
    .from('audit_log')
    .select('id, action, entity_type, entity_id, details, user_id, created_at')
    .eq('company_id', companyId)
    .in('action', [
      'DSAR_EXPORT',
      'ANONYMIZE',
      'SOFT_DELETE',
      'RESTORE',
      'HARD_DELETE',
      'AUTO_PURGE',
      'BULK_DELETE',
    ])
    .order('created_at', { ascending: false })

  if (options?.action) {
    query = query.eq('action', options.action)
  }

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType)
  }

  if (options?.entityId) {
    query = query.eq('entity_id', options.entityId)
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate.toISOString())
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate.toISOString())
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch GDPR audit log: ${error.message}`)
  }

  return (data ?? []).map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    details: entry.details as Record<string, unknown> | null,
    userId: entry.user_id,
    createdAt: entry.created_at,
  }))
}
