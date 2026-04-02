/** Stored in `tiers.max_*` and treated as unlimited across ComplyEur admin UI */
export const TIER_UNLIMITED_CAP = 999999

export const TIER_FEATURE_FLAG_KEYS = [
  'can_export_csv',
  'can_export_pdf',
  'can_forecast',
  'can_calendar',
  'can_bulk_import',
  'can_api_access',
  'can_sso',
  'can_audit_logs',
] as const

export type TierFeatureFlagKey = (typeof TIER_FEATURE_FLAG_KEYS)[number]

export const TIER_FEATURE_LABELS: Record<TierFeatureFlagKey, string> = {
  can_export_csv: 'CSV export',
  can_export_pdf: 'PDF export',
  can_forecast: 'Trip forecast',
  can_calendar: 'Calendar view',
  can_bulk_import: 'Bulk import',
  can_api_access: 'API access',
  can_sso: 'SSO',
  can_audit_logs: 'Audit logs',
}
