import { z } from 'zod'

/**
 * Validation schema for company settings
 * Used for both client-side form validation and server-side validation
 */
export const settingsSchema = z.object({
  // Data retention: 12-84 months (1-7 years)
  retention_months: z
    .number()
    .min(12, 'Minimum retention is 12 months')
    .max(84, 'Maximum retention is 84 months (7 years)'),

  // Session timeout: 5-120 minutes
  session_timeout_minutes: z
    .number()
    .min(5, 'Minimum timeout is 5 minutes')
    .max(120, 'Maximum timeout is 120 minutes'),

  // Risk thresholds must maintain hierarchy: green > amber > 0
  risk_threshold_green: z
    .number()
    .min(1, 'Green threshold must be at least 1')
    .max(89, 'Green threshold cannot exceed 89'),

  risk_threshold_amber: z
    .number()
    .min(1, 'Amber threshold must be at least 1')
    .max(88, 'Amber threshold cannot exceed 88'),

  // Future job warning: 50-89 days
  future_job_warning_threshold: z
    .number()
    .min(50, 'Warning threshold must be at least 50 days')
    .max(89, 'Warning threshold cannot exceed 89 days'),

  // Notification toggles
  notify_70_days: z.boolean(),
  notify_85_days: z.boolean(),
  notify_90_days: z.boolean(),
  weekly_digest: z.boolean(),

  // Custom threshold: null or 60-85
  custom_alert_threshold: z
    .number()
    .min(60, 'Custom threshold must be at least 60 days')
    .max(85, 'Custom threshold cannot exceed 85 days')
    .nullable(),
}).refine(
  (data) => data.risk_threshold_green > data.risk_threshold_amber,
  {
    message: 'Green threshold must be greater than amber threshold',
    path: ['risk_threshold_green'],
  }
)

export type SettingsFormData = z.infer<typeof settingsSchema>

/**
 * Partial schema for individual section updates
 */
export const dataPrivacySchema = z.object({
  retention_months: settingsSchema.shape.retention_months,
  session_timeout_minutes: settingsSchema.shape.session_timeout_minutes,
})

export const riskThresholdsSchema = z.object({
  risk_threshold_green: settingsSchema.shape.risk_threshold_green,
  risk_threshold_amber: settingsSchema.shape.risk_threshold_amber,
}).refine(
  (data) => data.risk_threshold_green > data.risk_threshold_amber,
  {
    message: 'Green threshold must be greater than amber threshold',
    path: ['risk_threshold_green'],
  }
)

export const forecastingSchema = z.object({
  future_job_warning_threshold: settingsSchema.shape.future_job_warning_threshold,
})

export const notificationsSchema = z.object({
  notify_70_days: settingsSchema.shape.notify_70_days,
  notify_85_days: settingsSchema.shape.notify_85_days,
  notify_90_days: settingsSchema.shape.notify_90_days,
  weekly_digest: settingsSchema.shape.weekly_digest,
  custom_alert_threshold: settingsSchema.shape.custom_alert_threshold,
})
