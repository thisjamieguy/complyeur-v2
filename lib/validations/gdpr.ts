import { z } from 'zod'

/**
 * GDPR validation schemas
 *
 * Validates GDPR-related operations including:
 * - Employee ID format (UUID)
 * - Deletion reasons
 * - Anonymization reasons
 */

/**
 * Validates employee ID format (UUID).
 * Used for DSAR exports, soft deletions, and anonymization.
 */
export const employeeIdSchema = z
  .string()
  .uuid('Invalid employee ID format')

/**
 * Schema for GDPR deletion with optional reason.
 */
export const gdprDeletionSchema = z.object({
  /** Employee ID (UUID) */
  employeeId: employeeIdSchema,
  /** Optional reason for deletion */
  reason: z
    .string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
})

export type GdprDeletionData = z.infer<typeof gdprDeletionSchema>

/**
 * Schema for GDPR anonymization with optional reason.
 */
export const gdprAnonymizationSchema = z.object({
  /** Employee ID (UUID) */
  employeeId: employeeIdSchema,
  /** Optional reason for anonymization */
  reason: z
    .string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
})

export type GdprAnonymizationData = z.infer<typeof gdprAnonymizationSchema>
