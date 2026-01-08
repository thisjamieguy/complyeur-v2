/**
 * Company settings types for Phase 13
 * Includes data retention, session management, risk thresholds,
 * forecasting, and notification preferences
 */

export interface CompanySettings {
  company_id: string

  // Data & Session
  retention_months: number
  session_timeout_minutes: number

  // Risk Thresholds (days remaining)
  risk_threshold_green: number   // Days remaining >= this = green status
  risk_threshold_amber: number   // Days remaining >= this = amber, below = red

  // Forecasting
  future_job_warning_threshold: number

  // Notifications
  notify_70_days: boolean
  notify_85_days: boolean
  notify_90_days: boolean
  weekly_digest: boolean
  custom_alert_threshold: number | null

  // Legacy fields from existing schema
  warning_threshold: number
  critical_threshold: number
  email_notifications: boolean
  warning_email_enabled: boolean
  urgent_email_enabled: boolean
  breach_email_enabled: boolean

  // Metadata
  created_at: string
  updated_at: string
}

export interface UpdateSettingsInput {
  retention_months?: number
  session_timeout_minutes?: number
  risk_threshold_green?: number
  risk_threshold_amber?: number
  future_job_warning_threshold?: number
  notify_70_days?: boolean
  notify_85_days?: boolean
  notify_90_days?: boolean
  weekly_digest?: boolean
  custom_alert_threshold?: number | null
}

// Default settings for new companies
export const DEFAULT_SETTINGS: Omit<CompanySettings, 'company_id' | 'created_at' | 'updated_at'> = {
  retention_months: 36,
  session_timeout_minutes: 30,
  risk_threshold_green: 30,
  risk_threshold_amber: 10,
  future_job_warning_threshold: 80,
  notify_70_days: true,
  notify_85_days: true,
  notify_90_days: true,
  weekly_digest: false,
  custom_alert_threshold: null,
  warning_threshold: 70,
  critical_threshold: 85,
  email_notifications: true,
  warning_email_enabled: true,
  urgent_email_enabled: true,
  breach_email_enabled: true,
}

// Session timeout options for the dropdown
export const SESSION_TIMEOUT_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
] as const
