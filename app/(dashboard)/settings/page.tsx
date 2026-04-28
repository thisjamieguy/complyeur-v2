import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronRight, Shield } from 'lucide-react'
import { SettingsForm } from '@/components/settings/settings-form'
import { SecuritySettings } from '@/components/settings/security-settings'
import { DangerZone } from '@/components/settings/danger-zone'
import { ResetPopupsSection } from '@/components/settings/reset-popups-section'
import { DateFormatPreferences } from '@/components/settings/date-format-preferences'
import { UserPreferencesForm } from './user-preferences-form'
import { getCompanySettings, canViewSettings, canUpdateSettings } from '@/lib/actions/settings'
import { getNotificationPreferencesAction } from '../actions'
import { getCompanyEntitlements } from '@/lib/billing/entitlements'
import { BillingSection } from '@/components/settings/billing-section'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { createClient } from '@/lib/supabase/server'
import type { NotificationPreferences } from '@/types/database-helpers'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Settings',
  description: 'Configure your company settings for Schengen compliance tracking',
}

const SETTINGS_SECTIONS = [
  {
    id: 'general',
    label: 'General',
    eyebrow: 'Organisation defaults',
    description: 'Retention, alerts, billing, and account controls.',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    eyebrow: 'Operational tools',
    description: 'Team access, saved import mappings, and import history.',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    eyebrow: 'Compliance controls',
    description: 'GDPR workflows and irreversible data operations.',
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
  let entitlements: Awaited<ReturnType<typeof getCompanyEntitlements>> = null
  let hasStripeCustomer = false
  let userId = ''

  if (activeSection === 'general') {
    const { companyId, userId: uid } = await requireCompanyAccessCached()
    userId = uid

    const [settingsResult, prefsResult, entitlementsResult, companyResult] = await Promise.all([
      getCompanySettings(),
      getUserPreferencesWithFallback(),
      getCompanyEntitlements(),
      createClient().then(s => s.from('companies').select('stripe_customer_id').eq('id', companyId).single()),
    ])
    settings = settingsResult
    userPreferences = prefsResult
    entitlements = entitlementsResult
    hasStripeCustomer = !!companyResult.data?.stripe_customer_id
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Settings
            </p>
            <h1 className="text-2xl font-semibold text-slate-950">Control how your workspace runs</h1>
            <p className="text-sm text-slate-600">
              Keep defaults, access, and compliance controls in one place without hunting through
              separate tools.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 lg:max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Active section
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{activeSectionMeta?.label}</p>
            <p className="mt-1 text-sm text-slate-600">{activeSectionMeta?.description}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <nav className="space-y-1" aria-label="Settings sections">
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = activeSection === section.id

              return (
                <Link
                  key={section.id}
                  href={`/settings?section=${section.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'block rounded-xl px-3 py-3 transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <p className="text-sm font-semibold">{section.label}</p>
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      isActive ? 'text-slate-300' : 'text-slate-600'
                    )}
                  >
                    {section.eyebrow}
                  </p>
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              {activeSectionMeta?.eyebrow}
            </p>
            <p className="mt-1 text-sm text-slate-700">{activeSectionMeta?.description}</p>
          </div>

          {activeSection === 'general' && (
            <>
              {settings ? (
                <>
                  <SettingsForm settings={settings} canEdit={canEdit} />
                  <BillingSection
                    tierSlug={entitlements?.tier_slug ?? null}
                    isTrial={entitlements?.is_trial ?? false}
                    trialEndsAt={entitlements?.trial_ends_at ?? null}
                    subscriptionStatus={entitlements?.subscription_status ?? null}
                    hasStripeCustomer={hasStripeCustomer}
                  />
                  <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Dashboard tour</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Replay the product walkthrough if you need a refresher on the briefing,
                      navigation, and key workflows.
                    </p>
                    <Link
                      href="/dashboard?tour=1"
                      className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                    >
                      Replay guided tour
                    </Link>
                  </div>
                  <ResetPopupsSection userId={userId} />
                  <DateFormatPreferences />
                  <SecuritySettings />

                  <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h2 className="mb-2 text-lg font-semibold text-slate-900">
                      Personal email preferences
                    </h2>
                    <p className="mb-6 text-sm text-slate-600">
                      Choose which compliance emails you receive personally. These changes only
                      affect your inbox.
                    </p>
                    <Suspense fallback={<div className="h-48 animate-pulse rounded bg-slate-100" />}>
                      <UserPreferencesForm preferences={userPreferences} disabled={false} />
                    </Suspense>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
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
                className="block rounded-xl border bg-white p-6 shadow-sm transition-colors hover:border-slate-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Access
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-950">
                      Team
                    </h2>
                    <p className="text-sm text-slate-600">
                      Invite teammates, assign roles, and transfer ownership.
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
                </div>
              </Link>

              <Link
                href="/settings/mappings"
                className="block rounded-xl border bg-white p-6 shadow-sm transition-colors hover:border-slate-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Imports
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-950">
                      Column mappings
                    </h2>
                    <p className="text-sm text-slate-600">
                      Review and reuse saved field mappings for CSV and spreadsheet imports.
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
                </div>
              </Link>

              <Link
                href="/settings/import-history"
                className="block rounded-xl border bg-white p-6 shadow-sm transition-colors hover:border-slate-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Audit trail
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-950">
                      Import history
                    </h2>
                    <p className="text-sm text-slate-600">
                      Check past import sessions, outcomes, and follow-up issues.
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
                </div>
              </Link>
            </>
          )}

          {activeSection === 'privacy' && (
            <>
              {canEdit ? (
                <Link
                  href="/gdpr"
                  className="block rounded-xl border bg-white p-6 shadow-sm transition-colors hover:border-slate-300 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                        <Shield className="h-5 w-5 text-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          GDPR
                        </p>
                        <h2 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-950">
                          Privacy tools
                        </h2>
                        <p className="text-sm text-slate-600">
                          Handle DSAR exports, anonymisation, and audit-ready privacy workflows.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
                  </div>
                </Link>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                  <h2 className="text-lg font-semibold text-amber-900">Privacy tools</h2>
                  <p className="mt-1 text-sm text-amber-800">
                    GDPR actions are only available to owners and admins.
                  </p>
                </div>
              )}

              <DangerZone />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
