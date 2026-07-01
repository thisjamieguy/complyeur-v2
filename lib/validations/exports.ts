import { z } from 'zod'

/**
 * Export validation schemas
 *
 * Validates export options including:
 * - Scope (all, single, filtered, future-alerts)
 * - Format (csv, pdf)
 * - Date range (ISO date strings)
 * - Employee ID (UUID, when scope is 'single')
 * - Status filter (when scope is 'filtered')
 * - Alerts filter (when scope is 'future-alerts')
 */

/**
 * ISO date string validation.
 * Matches YYYY-MM-DD format.
 */
const isoDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be in YYYY-MM-DD format'
  )
  .refine(
    (val) => !isNaN(Date.parse(val)),
    'Invalid date'
  )

/**
 * Date range schema for exports.
 */
const dateRangeSchema = z.object({
  /** Start date (ISO string YYYY-MM-DD) */
  start: isoDateSchema,
  /** End date / reference date (ISO string YYYY-MM-DD) */
  end: isoDateSchema,
}).refine(
  (data) => new Date(data.start) <= new Date(data.end),
  {
    message: 'Start date must be on or before end date',
    path: ['start'],
  }
)

/**
 * Export scope options.
 */
export const exportScopeSchema = z.enum(
  ['all', 'single', 'filtered', 'future-alerts'],
  'Please select a valid export scope'
)

/**
 * Export format options.
 */
export const exportFormatSchema = z.enum(
  ['csv', 'pdf'],
  'Please select CSV or PDF format'
)

/**
 * Status filter options for filtered exports.
 */
export const statusFilterSchema = z.enum(
  ['compliant', 'at-risk', 'non-compliant'],
  'Please select a valid status filter'
)

/**
 * Alerts filter options for future-alerts exports.
 */
export const alertsFilterSchema = z.enum(
  ['all', 'at-risk', 'critical'],
  'Please select a valid alerts filter'
)

/**
 * Complete export options schema.
 * Validates all export configuration with conditional requirements.
 */
export const exportOptionsSchema = z
  .object({
    /** Export scope */
    scope: exportScopeSchema,
    /** Single employee ID (required when scope is 'single') */
    employeeId: z.string().uuid('Invalid employee ID format').optional(),
    /** Status filter (when scope is 'filtered') */
    statusFilter: statusFilterSchema.optional(),
    /** Future alerts filter (when scope is 'future-alerts') */
    alertsFilter: alertsFilterSchema.optional(),
    /** Date range for the report */
    dateRange: dateRangeSchema,
    /** Export format */
    format: exportFormatSchema,
  })
  // Require employeeId when scope is 'single'
  .refine(
    (data) => {
      if (data.scope === 'single') {
        return !!data.employeeId
      }
      return true
    },
    {
      message: 'Employee ID is required for single employee exports',
      path: ['employeeId'],
    }
  )
  // Validate statusFilter is provided when scope is 'filtered'
  // (optional but if provided must be valid - already handled by enum)

export type ExportOptionsInput = z.input<typeof exportOptionsSchema>
export type ExportOptionsValidated = z.infer<typeof exportOptionsSchema>

/**
 * Travel audit scope options.
 */
export const travelAuditScopeSchema = z.enum(
  ['individual', 'company'],
  'Please select a valid audit scope'
)

/**
 * ISO 3166-1 alpha-2 country code.
 */
const isoCountrySchema = z
  .string()
  .regex(/^[A-Za-z]{2}$/, 'Country must be a 2-letter ISO code')

/**
 * Travel audit export options.
 * Used by the "Travel Audit" reports (individual + company-wide).
 */
export const travelAuditOptionsSchema = z
  .object({
    /** Audit scope */
    scope: travelAuditScopeSchema,
    /** Employee ID (required when scope is 'individual') */
    employeeId: z.string().uuid('Invalid employee ID format').optional(),
    /** Date range / time frame for the audit */
    dateRange: dateRangeSchema,
    /** Optional country filter (ISO codes) for customised reports */
    countries: z.array(isoCountrySchema).max(60).optional(),
    /** Export format */
    format: exportFormatSchema,
  })
  .refine((data) => data.scope !== 'individual' || !!data.employeeId, {
    message: 'Employee ID is required for an individual audit',
    path: ['employeeId'],
  })

export type TravelAuditOptionsInput = z.input<typeof travelAuditOptionsSchema>
export type TravelAuditOptionsValidated = z.infer<typeof travelAuditOptionsSchema>
