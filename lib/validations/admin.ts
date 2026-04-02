import { z } from 'zod'
import { TIER_UNLIMITED_CAP } from '@/lib/constants/admin-tiers'

/**
 * Admin validation schemas
 *
 * Validates admin panel actions including:
 * - Entitlement updates (max employees, max users, feature flags)
 * - Trial extensions (days, max 365)
 * - Company suspension (reason, status)
 * - Admin notes (content, category)
 */

// ============================================================================
// COMPANY ID VALIDATION
// ============================================================================

/**
 * Validates company ID format (UUID)
 */
export const companyIdSchema = z.string().uuid('Invalid company ID format')

// ============================================================================
// ENTITLEMENTS VALIDATION
// ============================================================================

/**
 * Schema for updating company entitlements.
 * All fields optional since this is a partial update.
 */
export const updateEntitlementsSchema = z.object({
  /** Tier identifier (e.g., 'free', 'pro', 'enterprise') */
  tier_slug: z
    .string()
    .min(1, 'Tier is required')
    .max(50, 'Tier must be less than 50 characters')
    .optional(),
  /** Maximum number of employees allowed (null = unlimited) */
  max_employees: z
    .number()
    .int('Must be a whole number')
    .positive('Must be a positive number')
    .max(10000, 'Cannot exceed 10,000 employees')
    .nullable()
    .optional(),
  /** Maximum number of users allowed (null = unlimited) */
  max_users: z
    .number()
    .int('Must be a whole number')
    .positive('Must be a positive number')
    .max(1000, 'Cannot exceed 1,000 users')
    .nullable()
    .optional(),
  /** Feature flags - all optional booleans */
  can_export_csv: z.boolean().nullable().optional(),
  can_export_pdf: z.boolean().nullable().optional(),
  can_forecast: z.boolean().nullable().optional(),
  can_calendar: z.boolean().nullable().optional(),
  can_bulk_import: z.boolean().nullable().optional(),
  can_api_access: z.boolean().nullable().optional(),
  can_sso: z.boolean().nullable().optional(),
  can_audit_logs: z.boolean().nullable().optional(),
  /** Admin notes explaining the override */
  override_notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
})

export type UpdateEntitlementsData = z.infer<typeof updateEntitlementsSchema>

// ============================================================================
// TRIAL EXTENSION VALIDATION
// ============================================================================

/**
 * Schema for extending a company's trial period.
 */
export const extendTrialSchema = z.object({
  /** Number of days to extend the trial */
  days: z
    .number()
    .int('Days must be a whole number')
    .positive('Days must be positive')
    .max(365, 'Cannot extend trial by more than 365 days'),
  /** Optional reason for the extension */
  reason: z
    .string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
})

export type ExtendTrialData = z.infer<typeof extendTrialSchema>

// ============================================================================
// COMPANY SUSPENSION VALIDATION
// ============================================================================

/**
 * Schema for suspending a company.
 */
export const suspendCompanySchema = z.object({
  /** Reason for suspension (required) */
  reason: z
    .string()
    .min(1, 'Suspension reason is required')
    .max(500, 'Reason must be less than 500 characters')
    .transform((val) => val.trim()),
})

export type SuspendCompanyData = z.infer<typeof suspendCompanySchema>

// ============================================================================
// ADMIN NOTES VALIDATION
// ============================================================================

/**
 * Valid categories for admin notes
 */
export const NOTE_CATEGORIES = [
  'general',
  'support',
  'billing',
  'custom_deal',
  'feature_request',
  'bug_report',
  'churn_risk',
  'onboarding',
  'upsell_opportunity',
] as const

export type NoteCategory = (typeof NOTE_CATEGORIES)[number]

/**
 * Schema for creating an admin note.
 */
export const addNoteSchema = z.object({
  /** Note content (required, 1-2000 chars) */
  note_content: z
    .string()
    .min(1, 'Note content is required')
    .max(2000, 'Note must be less than 2,000 characters')
    .transform((val) => val.trim()),
  /** Note category */
  category: z.enum(NOTE_CATEGORIES, 'Please select a valid category').optional().default('general'),
  /** Whether the note is pinned */
  is_pinned: z.boolean().optional().default(false),
  /** Follow-up date (ISO string or null) */
  follow_up_date: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .nullable()
    .optional(),
})

export type AddNoteData = z.infer<typeof addNoteSchema>

/**
 * Schema for updating an admin note.
 * All fields optional since this is a partial update.
 */
export const updateNoteSchema = z.object({
  /** Note content (1-2000 chars if provided) */
  note_content: z
    .string()
    .min(1, 'Note content is required')
    .max(2000, 'Note must be less than 2,000 characters')
    .transform((val) => val.trim())
    .optional(),
  /** Note category */
  category: z.enum(NOTE_CATEGORIES, 'Please select a valid category').optional(),
  /** Whether the note is pinned */
  is_pinned: z.boolean().optional(),
  /** Follow-up date (ISO string or null) */
  follow_up_date: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .nullable()
    .optional(),
})

export type UpdateNoteData = z.infer<typeof updateNoteSchema>

/**
 * UUID validation for note IDs
 */
export const noteIdSchema = z.string().uuid('Invalid note ID format')

// ============================================================================
// GLOBAL TIER MANAGEMENT (superadmin)
// ============================================================================

const tierCapSchema = z
  .number()
  .int()
  .refine((n) => n === TIER_UNLIMITED_CAP || (n >= 1 && n < TIER_UNLIMITED_CAP), {
    message: `Enter a positive limit or ${TIER_UNLIMITED_CAP} for unlimited`,
  })

const stripePriceIdNullable = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return value

    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  },
  z.union([
    z.null(),
    z.string().regex(/^price_[a-zA-Z0-9]+$/, 'Must be a Stripe Price ID (price_…)'),
  ])
)

const tierBooleanFlag = z.boolean()

export const adminTierSlugParamSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9][a-z0-9_-]*$/,
    'Slug must start with a letter or number and contain only lowercase letters, numbers, hyphens, and underscores'
  )

const tierSharedFields = {
  display_name: z.string().min(1, 'Name is required').max(120),
  description: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => v?.trim() || null),
  max_employees: tierCapSchema,
  max_users: tierCapSchema,
  can_export_csv: tierBooleanFlag,
  can_export_pdf: tierBooleanFlag,
  can_forecast: tierBooleanFlag,
  can_calendar: tierBooleanFlag,
  can_bulk_import: tierBooleanFlag,
  can_api_access: tierBooleanFlag,
  can_sso: tierBooleanFlag,
  can_audit_logs: tierBooleanFlag,
  stripe_price_id_monthly: stripePriceIdNullable,
  stripe_price_id_annual: stripePriceIdNullable,
  sort_order: z.number().int().min(0).max(10000),
  is_active: z.boolean(),
}

export const createTierFormSchema = z.object({
  slug: adminTierSlugParamSchema,
  ...tierSharedFields,
})

export const updateTierFormSchema = z.object({
  ...tierSharedFields,
})

export type CreateTierFormData = z.infer<typeof createTierFormSchema>
export type UpdateTierFormData = z.infer<typeof updateTierFormSchema>
