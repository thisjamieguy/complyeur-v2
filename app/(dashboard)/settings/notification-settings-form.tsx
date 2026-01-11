'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { updateCompanySettingsAction } from '../actions'
import type { CompanySettings } from '@/types/database'

interface NotificationSettingsFormProps {
  settings: CompanySettings
  disabled?: boolean
}

export function NotificationSettingsForm({ settings, disabled = false }: NotificationSettingsFormProps) {
  const [isPending, startTransition] = useTransition()

  // Form state with defaults for nullable values
  const [warningThreshold, setWarningThreshold] = useState(settings.warning_threshold ?? 60)
  const [criticalThreshold, setCriticalThreshold] = useState(settings.critical_threshold ?? 80)
  const [emailNotifications, setEmailNotifications] = useState(settings.email_notifications ?? false)
  const [warningEmailEnabled, setWarningEmailEnabled] = useState(settings.warning_email_enabled ?? false)
  const [urgentEmailEnabled, setUrgentEmailEnabled] = useState(settings.urgent_email_enabled ?? false)
  const [breachEmailEnabled, setBreachEmailEnabled] = useState(settings.breach_email_enabled ?? false)

  // Validation: warning < critical < 90
  const isValid = warningThreshold < criticalThreshold && criticalThreshold < 90

  // Check if form has changes
  const hasChanges =
    warningThreshold !== settings.warning_threshold ||
    criticalThreshold !== settings.critical_threshold ||
    emailNotifications !== settings.email_notifications ||
    warningEmailEnabled !== settings.warning_email_enabled ||
    urgentEmailEnabled !== settings.urgent_email_enabled ||
    breachEmailEnabled !== settings.breach_email_enabled

  // Handle warning slider change
  const handleWarningChange = (value: number[]) => {
    const newValue = value[0]
    // Ensure warning stays below critical
    if (newValue < criticalThreshold) {
      setWarningThreshold(newValue)
    }
  }

  // Handle critical slider change
  const handleCriticalChange = (value: number[]) => {
    const newValue = value[0]
    // Ensure critical stays above warning and below 90
    if (newValue > warningThreshold && newValue < 90) {
      setCriticalThreshold(newValue)
    }
  }

  const handleSubmit = () => {
    if (!isValid) {
      toast.error('Invalid thresholds. Warning must be less than Urgent, which must be less than 90.')
      return
    }

    startTransition(async () => {
      try {
        await updateCompanySettingsAction({
          warning_threshold: warningThreshold,
          critical_threshold: criticalThreshold,
          email_notifications: emailNotifications,
          warning_email_enabled: warningEmailEnabled,
          urgent_email_enabled: urgentEmailEnabled,
          breach_email_enabled: breachEmailEnabled,
        })
        toast.success('Settings saved successfully')
      } catch (error) {
        console.error('Failed to save settings:', error)
        toast.error('Failed to save settings')
      }
    })
  }

  const handleReset = () => {
    setWarningThreshold(settings.warning_threshold ?? 60)
    setCriticalThreshold(settings.critical_threshold ?? 80)
    setEmailNotifications(settings.email_notifications ?? false)
    setWarningEmailEnabled(settings.warning_email_enabled ?? false)
    setUrgentEmailEnabled(settings.urgent_email_enabled ?? false)
    setBreachEmailEnabled(settings.breach_email_enabled ?? false)
  }

  return (
    <div className="space-y-6">
      {/* Warning Threshold Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="warning-threshold" className="text-sm font-medium">
            Warning Threshold
          </Label>
          <span className="text-sm font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
            {warningThreshold} days
          </span>
        </div>
        <Slider
          id="warning-threshold"
          value={[warningThreshold]}
          onValueChange={handleWarningChange}
          min={50}
          max={85}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-slate-500">
          Trigger a warning alert when days used reaches this threshold (50-85)
        </p>
      </div>

      {/* Urgent (Critical) Threshold Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="critical-threshold" className="text-sm font-medium">
            Urgent Threshold
          </Label>
          <span className="text-sm font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
            {criticalThreshold} days
          </span>
        </div>
        <Slider
          id="critical-threshold"
          value={[criticalThreshold]}
          onValueChange={handleCriticalChange}
          min={60}
          max={89}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-slate-500">
          Trigger an urgent alert when days used reaches this threshold (60-89)
        </p>
      </div>

      {/* Breach Threshold (Locked) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-slate-400">
            Breach Threshold
          </Label>
          <span className="text-sm font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded">
            90 days
          </span>
        </div>
        <Slider
          value={[90]}
          min={90}
          max={90}
          step={1}
          disabled
          className="w-full opacity-50"
        />
        <p className="text-xs text-slate-500">
          Legal limit - cannot be changed (fixed at 90 days per EU Regulation 610/2013)
        </p>
      </div>

      {/* Visual threshold display */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center h-8 relative">
          <div className="absolute inset-0 flex">
            {/* Safe zone (0 to warning) */}
            <div
              className="bg-green-200 rounded-l"
              style={{ width: `${(warningThreshold / 90) * 100}%` }}
            />
            {/* Warning zone (warning to critical) */}
            <div
              className="bg-amber-200"
              style={{ width: `${((criticalThreshold - warningThreshold) / 90) * 100}%` }}
            />
            {/* Urgent zone (critical to 90) */}
            <div
              className="bg-orange-200"
              style={{ width: `${((90 - criticalThreshold) / 90) * 100}%` }}
            />
            {/* Breach zone (after 90) */}
            <div className="bg-red-200 rounded-r flex-1" />
          </div>
          {/* Markers */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-600"
            style={{ left: `${(warningThreshold / 100) * 100}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-orange-600"
            style={{ left: `${(criticalThreshold / 100) * 100}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-600"
            style={{ left: '90%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-2">
          <span>0 days</span>
          <span>{warningThreshold}</span>
          <span>{criticalThreshold}</span>
          <span className="text-red-600 font-medium">90</span>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Email settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Email Notifications</h3>

        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="email-notifications" className="text-sm">
              Enable email notifications
            </Label>
            <p className="text-xs text-slate-500">Master switch for all email alerts</p>
          </div>
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>

        {/* Per-type toggles */}
        <div className={`space-y-3 pl-4 border-l-2 border-slate-200 ${!emailNotifications ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <Label htmlFor="warning-email" className="text-sm">
              Warning alerts
            </Label>
            <Switch
              id="warning-email"
              checked={warningEmailEnabled}
              onCheckedChange={setWarningEmailEnabled}
              disabled={!emailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="urgent-email" className="text-sm">
              Urgent alerts
            </Label>
            <Switch
              id="urgent-email"
              checked={urgentEmailEnabled}
              onCheckedChange={setUrgentEmailEnabled}
              disabled={!emailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="breach-email" className="text-sm">
                Breach alerts
              </Label>
              <p className="text-xs text-slate-500">Strongly recommended</p>
            </div>
            <Switch
              id="breach-email"
              checked={breachEmailEnabled}
              onCheckedChange={setBreachEmailEnabled}
              disabled={!emailNotifications}
            />
          </div>
        </div>
      </div>

      {/* Validation error */}
      {!isValid && (
        <p className="text-sm text-red-600">
          Warning threshold must be less than Urgent threshold
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={disabled || !hasChanges || isPending}
        >
          Reset
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={disabled || !hasChanges || !isValid || isPending}
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
