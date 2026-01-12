'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { OverviewTab } from './tabs/overview-tab'
import { EntitlementsTab } from './tabs/entitlements-tab'
import { UsersTab } from './tabs/users-tab'
import { NotesTab } from './tabs/notes-tab'
import { ActivityTab } from './tabs/activity-tab'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'entitlements', label: 'Entitlements' },
  { id: 'users', label: 'Users' },
  { id: 'notes', label: 'Notes' },
  { id: 'activity', label: 'Activity' },
] as const

type TabId = typeof tabs[number]['id']

interface CompanyTabsProps {
  company: {
    id: string
    name: string
    slug: string
    created_at: string | null
    company_entitlements: {
      id: string
      tier_slug: string | null
      max_employees: number | null
      max_users: number | null
      can_export_csv: boolean | null
      can_export_pdf: boolean | null
      can_forecast: boolean | null
      can_calendar: boolean | null
      can_bulk_import: boolean | null
      can_api_access: boolean | null
      can_sso: boolean | null
      can_audit_logs: boolean | null
      is_trial: boolean | null
      trial_ends_at: string | null
      is_suspended: boolean | null
      suspended_at: string | null
      suspended_reason: string | null
      manual_override: boolean | null
      override_notes: string | null
    } | null
    company_settings: unknown
    profiles: Array<{
      id: string
      full_name: string | null
      role: string | null
      created_at: string | null
    }>
    employees: Array<{ count: number }>
    company_notes: Array<{
      id: string
      note_content: string
      category: string | null
      is_pinned: boolean | null
      follow_up_date: string | null
      created_at: string
      updated_at: string
      profiles: { full_name: string | null } | null
    }>
  }
  tier: {
    slug: string
    display_name: string
    max_employees: number
    max_users: number
    can_export_csv: boolean | null
    can_export_pdf: boolean | null
    can_forecast: boolean | null
    can_calendar: boolean | null
    can_bulk_import: boolean | null
    can_api_access: boolean | null
    can_sso: boolean | null
    can_audit_logs: boolean | null
  } | null
  tiers: Array<{
    slug: string
    display_name: string
  }>
  activity: Array<{
    id: string
    action: string
    created_at: string
    details: Record<string, unknown> | null
    profiles: { full_name: string | null } | null
  }>
}

export function CompanyTabs({ company, tier, tiers, activity }: CompanyTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 -mb-px" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab company={company} tier={tier} />
        )}
        {activeTab === 'entitlements' && (
          <EntitlementsTab company={company} tier={tier} tiers={tiers} />
        )}
        {activeTab === 'users' && (
          <UsersTab company={company} />
        )}
        {activeTab === 'notes' && (
          <NotesTab company={company} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab activities={activity} />
        )}
      </div>
    </div>
  )
}
