import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronRight, FileSpreadsheet, History, Shield, Users } from 'lucide-react'
import { SettingsForm } from '@/components/settings/settings-form'
import { SecuritySettings } from '@/components/settings/security-settings'
import { DangerZone } from '@/components/settings/danger-zone'
import { UserPreferencesForm } from './user-preferences-form'
import { getCompanySettings, canViewSettings, canUpdateSettings } from '@/lib/actions/settings'
import { getNotificationPreferencesAction } from '../actions'
import type { NotificationPreferences } from '@/types/database-helpers'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Settings | ComplyEUR',
  description: 'Configure your company settings for Schengen compliance tracking',
}

const SETTINGS_SECTIONS = [
  {
    id: 'general',
    label: 'General',
    description: 'Company defaults, security, and your personal notification preferences.',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Team access, import mappings, and import history.',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    description: 'GDPR workflows and destructive data operations.',
  },
] as const

type SettingsSection = typeof SETTINGS_SECTIONS[number]['id']

interface SettingsPageProps {
  searchParams: Promise<{ section?: string }>
}

function getActiveSection(section: string | undefined): SettingsSection {
  if (section === 'workspace' || section === 'privacy') {
    return section
  }
  return 'general'
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

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams
  const activeSection = getActiveSection(params.section)
  const activeSectionMeta = SETTINGS_SECTIONS.find((section) => section.id === activeSection)

  // Check permissions in parallel
  const [hasViewPermission, canEdit] = await Promise.all([
    canViewSettings(),
    canUpdateSettings(),
  ])

  if (!hasViewPermission) {
    redirect('/dashboard')
  }

  let settings = null
  let userPreferences = defaultUserPreferences

  if (activeSection === 'general') {
    [settings, userPreferences] = await Promise.all([
      getCompanySettings(),
      getUserPreferencesWithFallback(),
    ])
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">
          Configure how ComplyEUR works for your organization.
        </p>
      </div>

      <div className="space-y-3">
        <div className="border-b border-slate-200">
          <nav className="flex gap-4 -mb-px overflow-x-auto" aria-label="Settings sections">
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = activeSection === section.id
              return (
                <Link
                  key={section.id}
                  href={`/settings?section=${section.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'px-1 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  )}
                >
                  {section.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <p className="text-sm text-slate-600">
          {activeSectionMeta?.description}
        </p>
      </div>

      {activeSection === 'general' && (
        <>
          {settings ? (
            <>
              <SettingsForm settings={settings} canEdit={canEdit} />
              <SecuritySettings />

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
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                Unable to load settings. Please try again or contact support.
              </p>
            </div>
          )}
        </>
      )}

      {activeSection === 'workspace' && (
        <>
          <Link
            href="/settings/team"
            className="block bg-white rounded-xl border shadow-sm p-6 hover:border-slate-300 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Team
                  </h2>
                  <p className="text-sm text-slate-600">
                    Invite teammates, assign roles, and transfer ownership
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-700 transition-colors" />
            </div>
          </Link>

          <Link
            href="/settings/mappings"
            className="block bg-white rounded-xl border shadow-sm p-6 hover:border-slate-300 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Column Mappings
                  </h2>
                  <p className="text-sm text-slate-600">
                    Manage saved column mappings for data imports
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </Link>

          <Link
            href="/settings/import-history"
            className="block bg-white rounded-xl border shadow-sm p-6 hover:border-slate-300 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <History className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                    Import History
                  </h2>
                  <p className="text-sm text-slate-600">
                    View past import sessions and their results
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </Link>
        </>
      )}

      {activeSection === 'privacy' && (
        <>
          {canEdit ? (
            <Link
              href="/gdpr"
              className="block bg-white rounded-xl border shadow-sm p-6 hover:border-slate-300 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      GDPR & Privacy Tools
                    </h2>
                    <p className="text-sm text-slate-600">
                      Handle DSAR exports, anonymization, and audit trails
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-700 transition-colors" />
              </div>
            </Link>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-amber-900">GDPR & Privacy Tools</h2>
              <p className="text-sm text-amber-800 mt-1">
                GDPR actions are only available to Owners and Admins.
              </p>
            </div>
          )}

          <DangerZone />
        </>
      )}
    </div>
  )
}
