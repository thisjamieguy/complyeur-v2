import { SettingsSectionHeader } from '@/components/settings/settings-section-header'
import { SettingsForm } from '@/components/settings/settings-form'
import { getCompanySettings, canUpdateSettings } from '@/lib/actions/settings'

export const metadata = {
  title: 'Company',
  description: 'Configure organisation-wide compliance defaults, thresholds, and alerts',
}

export default async function CompanySettingsPage() {
  const [settings, canEdit] = await Promise.all([
    getCompanySettings(),
    canUpdateSettings(),
  ])

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        eyebrow="Organisation"
        title="Company settings"
        description="Organisation-wide defaults that apply to everyone — data retention, status thresholds, forecasting, calendar, and team email alerts."
      />

      {settings ? (
        <SettingsForm settings={settings} canEdit={canEdit} />
      ) : (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load company settings. Please try again or contact support.
        </div>
      )}
    </div>
  )
}
