import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SettingsForm } from '@/components/settings'
import { UserPreferencesForm } from './user-preferences-form'
import { getCompanySettings, canViewSettings, canUpdateSettings } from '@/lib/actions/settings'
import { getNotificationPreferencesAction } from '../actions'
import type { NotificationPreferences } from '@/types/database'

export const metadata = {
  title: 'Settings | ComplyEUR',
  description: 'Configure your company settings for Schengen compliance tracking',
}

// Default user preferences when tables don't exist
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

async function getUserPreferencesWithFallback(): Promise<NotificationPreferences> {
  try {
    return await getNotificationPreferencesAction()
  } catch (error) {
    console.error('User preferences fetch failed:', error)
    return defaultUserPreferences
  }
}

export default async function SettingsPage() {
  // Check if user can view settings
  const hasViewPermission = await canViewSettings()
  if (!hasViewPermission) {
    redirect('/dashboard')
  }

  // Get settings, edit permission, and user preferences in parallel
  const [settings, canEdit, userPreferences] = await Promise.all([
    getCompanySettings(),
    canUpdateSettings(),
    getUserPreferencesWithFallback(),
  ])

  if (!settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">
            Configure how ComplyEUR works for your organization.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Unable to load settings. Please try again or contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">
          Configure how ComplyEUR works for your organization.
        </p>
      </div>

      {/* Company-wide settings form with all sections */}
      <SettingsForm settings={settings} canEdit={canEdit} />

      {/* Personal email preferences - separate section */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Your Personal Email Preferences
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Control which email notifications you receive personally.
          This only affects your inbox, not other team members.
        </p>
        <Suspense fallback={<div className="animate-pulse h-48 bg-slate-100 rounded" />}>
          <UserPreferencesForm preferences={userPreferences} disabled={false} />
        </Suspense>
      </div>
    </div>
  )
}
