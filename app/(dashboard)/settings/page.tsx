import { Suspense } from 'react'
import { getCompanySettingsAction, getNotificationPreferencesAction } from '../actions'
import { NotificationSettingsForm } from './notification-settings-form'
import { UserPreferencesForm } from './user-preferences-form'
import type { CompanySettings, NotificationPreferences } from '@/types/database'

// Default values when tables don't exist yet
const defaultCompanySettings: CompanySettings = {
  company_id: '',
  retention_months: 36,
  warning_threshold: 70,
  critical_threshold: 85,
  email_notifications: true,
  warning_email_enabled: true,
  urgent_email_enabled: true,
  breach_email_enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const defaultUserPreferences: NotificationPreferences = {
  id: '',
  user_id: '',
  company_id: '',
  receive_warning_emails: true,
  receive_urgent_emails: true,
  receive_breach_emails: true,
  unsubscribe_token: '',
  unsubscribed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

async function getSettingsWithFallback(): Promise<{
  companySettings: CompanySettings
  userPreferences: NotificationPreferences
  migrationPending: boolean
}> {
  try {
    const [companySettings, userPreferences] = await Promise.all([
      getCompanySettingsAction(),
      getNotificationPreferencesAction(),
    ])
    return { companySettings, userPreferences, migrationPending: false }
  } catch (error) {
    console.error('Settings fetch failed (migration may be pending):', error)
    return {
      companySettings: defaultCompanySettings,
      userPreferences: defaultUserPreferences,
      migrationPending: true,
    }
  }
}

export default async function SettingsPage() {
  const { companySettings, userPreferences, migrationPending } = await getSettingsWithFallback()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notification Settings</h1>
        <p className="text-slate-600 mt-1">
          Configure alert thresholds and email notification preferences
        </p>
      </div>

      {migrationPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-medium text-amber-900 mb-2">Database Migration Required</h3>
          <p className="text-sm text-amber-800">
            The notification settings tables have not been created yet. Please run the database migration:
          </p>
          <pre className="mt-2 text-xs bg-amber-100 p-2 rounded font-mono">
            supabase db push
          </pre>
          <p className="text-sm text-amber-800 mt-2">
            Settings shown below are defaults and cannot be saved until the migration is complete.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Company-wide settings */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Alert Thresholds
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Configure when alerts are triggered based on days used in the 180-day window.
            These settings apply to all employees in your company.
          </p>
          <Suspense fallback={<div className="animate-pulse h-64 bg-slate-100 rounded" />}>
            <NotificationSettingsForm settings={companySettings} disabled={migrationPending} />
          </Suspense>
        </div>

        {/* Personal email preferences */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Your Email Preferences
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Control which email notifications you receive personally.
            This only affects your inbox, not other team members.
          </p>
          <Suspense fallback={<div className="animate-pulse h-48 bg-slate-100 rounded" />}>
            <UserPreferencesForm preferences={userPreferences} disabled={migrationPending} />
          </Suspense>
        </div>
      </div>

      {/* Info about thresholds */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Alert Thresholds</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>Warning:</strong> Early notice when an employee is approaching limits (default: 70 days)
          </li>
          <li>
            <strong>Urgent:</strong> Immediate attention needed, very close to limit (default: 85 days)
          </li>
          <li>
            <strong>Breach:</strong> Legal limit exceeded, cannot be changed (fixed at 90 days)
          </li>
        </ul>
      </div>
    </div>
  )
}
