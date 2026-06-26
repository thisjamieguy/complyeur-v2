import { Suspense } from 'react'
import Link from 'next/link'
import { PlayCircle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SettingsSectionHeader } from '@/components/settings/settings-section-header'
import { SecuritySettings } from '@/components/settings/security-settings'
import { ResetPopupsSection } from '@/components/settings/reset-popups-section'
import { DateFormatPreferences } from '@/components/settings/date-format-preferences'
import { UserPreferencesForm } from './user-preferences-form'
import { getNotificationPreferencesAction } from '../actions'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import type { NotificationPreferences } from '@/types/database-helpers'

export const metadata = {
  title: 'Account',
  description: 'Manage your personal sign-in, notifications, and display preferences',
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

export default async function AccountSettingsPage() {
  const [{ userId }, userPreferences] = await Promise.all([
    requireCompanyAccessCached(),
    getUserPreferencesWithFallback(),
  ])

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        eyebrow="Account"
        title="Your account"
        description="Personal settings that only affect you — sign-in, the emails you receive, and how things display."
      />

      <SecuritySettings />

      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
          <CardDescription>
            Choose which compliance emails land in your inbox. These changes only affect you,
            not your teammates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted" />}>
            <UserPreferencesForm preferences={userPreferences} disabled={false} />
          </Suspense>
        </CardContent>
      </Card>

      <DateFormatPreferences />

      <ResetPopupsSection userId={userId} />

      <Card>
        <CardHeader>
          <CardTitle>Product tour</CardTitle>
          <CardDescription>
            Replay the guided walkthrough of the briefing, navigation, and key workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard?tour=1"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <PlayCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Replay guided tour
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
