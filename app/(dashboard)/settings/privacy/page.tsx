import Link from 'next/link'
import { ChevronRight, Shield } from 'lucide-react'
import { SettingsSectionHeader } from '@/components/settings/settings-section-header'
import { DangerZone } from '@/components/settings/danger-zone'
import { canUpdateSettings } from '@/lib/actions/settings'

export const metadata = {
  title: 'Privacy & data',
  description: 'GDPR workflows and irreversible data operations',
}

export default async function PrivacySettingsPage() {
  const canEdit = await canUpdateSettings()

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        eyebrow="Data & privacy"
        title="Privacy & data"
        description="Run GDPR workflows and manage irreversible data operations for your organisation."
      />

      {canEdit ? (
        <Link
          href="/gdpr"
          className="group block rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-brand-300"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <Shield className="h-5 w-5 text-brand-600" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">
                  GDPR
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-brand-700">
                  Privacy tools
                </h3>
                <p className="text-sm text-muted-foreground">
                  Handle DSAR exports, anonymisation, and audit-ready privacy workflows.
                </p>
              </div>
            </div>
            <ChevronRight
              className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-600"
              aria-hidden="true"
            />
          </div>
        </Link>
      ) : (
        <div className="rounded-xl border border-status-amber-border bg-status-amber-light p-6">
          <h3 className="text-lg font-semibold text-foreground">Privacy tools</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            GDPR actions are only available to owners and admins.
          </p>
        </div>
      )}

      <DangerZone />
    </div>
  )
}
