'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { DataPrivacySection } from './data-privacy-section'
import { RiskThresholdsSection } from './risk-thresholds-section'
import { ForecastingSection } from './forecasting-section'
import { NotificationsSection } from './notifications-section'
import { settingsSchema, type SettingsFormData } from '@/lib/validations/settings'
import { updateCompanySettings } from '@/lib/actions/settings'
import type { CompanySettings } from '@/lib/types/settings'

interface SettingsFormProps {
  settings: CompanySettings
  canEdit: boolean
}

export function SettingsForm({ settings, canEdit }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      retention_months: settings.retention_months,
      session_timeout_minutes: settings.session_timeout_minutes,
      risk_threshold_green: settings.risk_threshold_green,
      risk_threshold_amber: settings.risk_threshold_amber,
      future_job_warning_threshold: settings.future_job_warning_threshold,
      notify_70_days: settings.notify_70_days,
      notify_85_days: settings.notify_85_days,
      notify_90_days: settings.notify_90_days,
      weekly_digest: settings.weekly_digest,
      custom_alert_threshold: settings.custom_alert_threshold,
    },
  })

  // Track dirty state
  const { isDirty } = form.formState

  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty])

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const onSubmit = (data: SettingsFormData) => {
    startTransition(async () => {
      const result = await updateCompanySettings(data)

      if (result.success) {
        toast.success('Settings saved successfully')
        form.reset(data)
        setHasUnsavedChanges(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save settings')
      }
    })
  }

  const handleCancel = () => {
    form.reset()
    setHasUnsavedChanges(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!canEdit && (
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You have read-only access to settings. Contact an admin to make changes.
            </AlertDescription>
          </Alert>
        )}

        <DataPrivacySection disabled={!canEdit || isPending} />
        <RiskThresholdsSection disabled={!canEdit || isPending} />
        <ForecastingSection disabled={!canEdit || isPending} />
        <NotificationsSection disabled={!canEdit || isPending} />

        {canEdit && (
          <div className="flex justify-end gap-3 sticky bottom-6 bg-slate-50 p-4 -mx-4 rounded-lg border shadow-sm">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!isDirty || isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
